/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { defineVersioning, StorageSchemaVersioning } from './schema_versioning';

describe('defineVersioning', () => {
  const v1Schema = z.object({ foo: z.string() });

  it('creates a builder that can be built with a single version', () => {
    const versioning = defineVersioning(v1Schema).build();

    expect(versioning).toBeInstanceOf(StorageSchemaVersioning);
    expect(versioning.latestVersion).toBe(1);
    expect(versioning.latestSchema).toBe(v1Schema);
  });

  it('chains multiple versions via addVersion', () => {
    const v2Schema = z.object({ foo: z.string(), bar: z.number() });
    const v3Schema = z.object({ foo: z.string(), bar: z.number(), baz: z.boolean() });

    const versioning = defineVersioning(v1Schema)
      .addVersion({
        schema: v2Schema,
        migrate: (prev) => ({ ...prev, bar: 0 }),
      })
      .addVersion({
        schema: v3Schema,
        migrate: (prev) => ({ ...prev, baz: false }),
      })
      .build();

    expect(versioning.latestVersion).toBe(3);
    expect(versioning.latestSchema).toBe(v3Schema);
  });
});

describe('StorageSchemaVersioning', () => {
  describe('constructor validation', () => {
    it('throws when given an empty definitions array', () => {
      expect(() => new StorageSchemaVersioning([])).toThrow(
        'At least one version definition is required'
      );
    });

    it('throws when version numbers are not sequential', () => {
      expect(
        () =>
          new StorageSchemaVersioning([
            { version: 1, schema: z.object({}) },
            { version: 3, schema: z.object({}), migrate: () => ({}) },
          ])
      ).toThrow('Version definitions must be sequential: expected version 2, got 3');
    });

    it('throws when a non-initial version is missing a migrate function', () => {
      expect(
        () =>
          new StorageSchemaVersioning([
            { version: 1, schema: z.object({}) },
            { version: 2, schema: z.object({}) },
          ])
      ).toThrow('Version 2 must provide a migrate function');
    });
  });

  describe('migrate', () => {
    const versioning = defineVersioning(z.object({ foo: z.string() }))
      .addVersion({
        schema: z.object({ foo: z.string(), bar: z.number() }),
        migrate: (prev) => ({ ...prev, bar: 42 }),
      })
      .addVersion({
        schema: z.object({ foo: z.string(), bar: z.number(), baz: z.boolean() }),
        migrate: (prev) => ({ ...prev, baz: prev.bar > 0 }),
      })
      .build();

    it('validates and returns the document when already at the latest version', async () => {
      const doc = { foo: 'hello', bar: 10, baz: true };
      await expect(versioning.migrate(doc, 3)).resolves.toEqual(doc);
    });

    it('migrates from version 1 to the latest through every step', async () => {
      const result = await versioning.migrate({ foo: 'hello' }, 1);
      expect(result).toEqual({ foo: 'hello', bar: 42, baz: true });
    });

    it('migrates from an intermediate version to the latest', async () => {
      const result = await versioning.migrate({ foo: 'hello', bar: -1 }, 2);
      expect(result).toEqual({ foo: 'hello', bar: -1, baz: false });
    });

    it('validates the source document against its declared version schema', async () => {
      await expect(versioning.migrate({ wrong: 'shape' }, 1)).rejects.toThrow();
    });

    it('validates the output of each migration step', async () => {
      const broken = defineVersioning(z.object({ a: z.string() }))
        .addVersion({
          schema: z.object({ a: z.string(), b: z.number() }),
          migrate: () => ({ a: 'ok' } as any),
        })
        .build();

      await expect(broken.migrate({ a: 'test' }, 1)).rejects.toThrow();
    });

    it('throws on invalid fromVersion values', async () => {
      await expect(versioning.migrate({}, 0)).rejects.toThrow(
        'Invalid source version 0: expected an integer between 1 and 3'
      );
      await expect(versioning.migrate({}, 4)).rejects.toThrow(
        'Invalid source version 4: expected an integer between 1 and 3'
      );
      await expect(versioning.migrate({}, 1.5)).rejects.toThrow(
        'Invalid source version 1.5: expected an integer between 1 and 3'
      );
    });

    it('works with a single-version chain (no migrations)', async () => {
      const single = defineVersioning(z.object({ x: z.number() })).build();
      await expect(single.migrate({ x: 99 }, 1)).resolves.toEqual({ x: 99 });
    });

    it('strips unknown fields via zod strict parsing when schema uses strict()', async () => {
      const strict = defineVersioning(z.object({ a: z.string() }).strict()).build();
      await expect(strict.migrate({ a: 'ok', extra: true }, 1)).rejects.toThrow();
    });

    it('applies zod transforms during migration', async () => {
      const withTransform = defineVersioning(z.object({ raw: z.string() }))
        .addVersion({
          schema: z.object({ raw: z.string(), parsed: z.number() }),
          migrate: (prev) => ({ ...prev, parsed: parseInt(prev.raw, 10) }),
        })
        .build();

      await expect(withTransform.migrate({ raw: '42' }, 1)).resolves.toEqual({
        raw: '42',
        parsed: 42,
      });
    });

    it('supports async migrate functions', async () => {
      const asyncVersioning = defineVersioning(z.object({ name: z.string() }))
        .addVersion({
          schema: z.object({ name: z.string(), slug: z.string() }),
          migrate: async (prev) => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            return { ...prev, slug: prev.name.toLowerCase().replace(/\s+/g, '-') };
          },
        })
        .addVersion({
          schema: z.object({ name: z.string(), slug: z.string(), version: z.number() }),
          migrate: async (prev) => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            return { ...prev, version: 2 };
          },
        })
        .build();

      const result = await asyncVersioning.migrate({ name: 'Hello World' }, 1);
      expect(result).toEqual({ name: 'Hello World', slug: 'hello-world', version: 2 });
    });

    it('supports mixed sync and async migrate functions', async () => {
      const mixedVersioning = defineVersioning(z.object({ a: z.number() }))
        .addVersion({
          schema: z.object({ a: z.number(), b: z.string() }),
          migrate: (prev) => ({ ...prev, b: String(prev.a) }),
        })
        .addVersion({
          schema: z.object({ a: z.number(), b: z.string(), c: z.boolean() }),
          migrate: async (prev) => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            return { ...prev, c: prev.a > 0 };
          },
        })
        .build();

      const result = await mixedVersioning.migrate({ a: 5 }, 1);
      expect(result).toEqual({ a: 5, b: '5', c: true });
    });
  });
});
