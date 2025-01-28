/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { initTransform } from './object_transform';

import type { ObjectMigrationDefinition, Version, VersionableObject } from './types';

interface FooV1 {
  fullName: string;
}

const v1Tv2Transform = jest.fn((v1: FooV1): FooV2 => {
  const [firstName, lastName] = v1.fullName.split(' ');
  return { firstName, lastName };
});

const fooDefV1: VersionableObject<any, any, any, any> = {
  schema: schema.object({
    fullName: schema.string({ minLength: 1 }),
  }),
  up: v1Tv2Transform,
};

interface FooV2 {
  firstName: string;
  lastName: string;
}

const v2Tv1Transform = jest.fn((v2: FooV2): FooV1 => {
  return {
    fullName: `${v2.firstName} ${v2.lastName}`,
  };
});

const fooDefV2: VersionableObject<any, any, any, any> = {
  schema: schema.object({
    firstName: schema.string(),
    lastName: schema.string(),
  }),
  down: v2Tv1Transform,
};

const fooMigrationDef: ObjectMigrationDefinition = {
  1: fooDefV1,
  2: fooDefV2,
};

const setup = <UpIn = unknown, UpOut = unknown, DownIn = unknown, DownOut = unknown>(
  browserVersion: Version
) => {
  const transformsFactory = initTransform<UpIn, UpOut, DownIn, DownOut>(browserVersion);
  return transformsFactory(fooMigrationDef);
};

describe('object transform', () => {
  describe('initTransform()', () => {
    test('it should validate that version numbers are valid', () => {
      expect(() => {
        initTransform(2)({
          // @ts-expect-error
          abc: { up: () => undefined },
        });
      }).toThrowError('Invalid version number [abc].');
    });
  });

  describe('up()', () => {
    test('it should up transform to the latest version', () => {
      const fooTransforms = setup(1);
      const { value } = fooTransforms.up({ fullName: 'John Snow' });
      const expected = { firstName: 'John', lastName: 'Snow' };
      expect(value).toEqual(expected);
    });

    test('it should forward object if on same version', () => {
      const fooTransforms = setup(2);
      const obj = { firstName: 'John', lastName: 'Snow' };
      const { value } = fooTransforms.up(obj);
      expect(value).toBe(obj);
    });

    describe('validation', () => {
      test('it should validate the object before up transform', () => {
        const fooTransforms = setup(1);
        const { error } = fooTransforms.up({ unknown: 'John Snow' });
        expect(error!.message).toBe(
          '[fullName]: expected value of type [string] but got [undefined]'
        );
      });

      test('it should validate that the version to up transform to exists', () => {
        const fooTransforms = setup(1);
        const { error } = fooTransforms.up({ fullName: 'John Snow' }, 3);
        expect(error!.message).toBe('Unvalid version to up transform to [3].');
      });

      test('it should validate that the version to up transform from exists', () => {
        const fooTransforms = setup(0);
        const { error } = fooTransforms.up({ fullName: 'John Snow' });
        expect(error!.message).toBe('Unvalid version to up transform from [0].');
      });

      test('it should handle errors while up transforming', () => {
        const fooTransforms = setup(1);

        v1Tv2Transform.mockImplementation((v1) => {
          return (v1 as any).unknown.split('');
        });

        const { error } = fooTransforms.up({ fullName: 'John Snow' });

        expect(error!.message).toBe(
          `[Transform error] Cannot read properties of undefined (reading 'split').`
        );
      });
    });
  });

  describe('down()', () => {
    test('it should down transform to a previous version', () => {
      const fooTransforms = setup<
        void,
        void,
        { firstName: string; lastName: string },
        { fullName: string }
      >(1);
      const { value } = fooTransforms.down({ firstName: 'John', lastName: 'Snow' });
      const expected = { fullName: 'John Snow' };
      expect(value).toEqual(expected);
    });

    test('it should forward object if on same version', () => {
      const fooTransforms = setup(1);
      const obj = { fullName: 'John Snow' };
      const { value } = fooTransforms.down(obj, 1);
      expect(value).toBe(obj);
    });

    describe('validation', () => {
      test('it should validate the object before down transform', () => {
        const fooTransforms = setup(1);

        const { error } = fooTransforms.down({ bad: 'Unknown' });
        expect(error).not.toBe(null);
        expect(error!.message).toBe(
          '[firstName]: expected value of type [string] but got [undefined]'
        );
      });

      test('it should validate that the version to down transform from exists', () => {
        const fooTransforms = setup(1);
        const { error } = fooTransforms.down({ fullName: 'John Snow' }, 3);
        expect(error!.message).toBe('Unvalid version to down transform from [3].');
      });

      test('it should validate that the version to down transform to exists', () => {
        const fooTransforms = setup(0);
        const { error } = fooTransforms.down({ firstName: 'John', lastName: 'Snow' });
        expect(error!.message).toBe('Unvalid version to down transform to [0].');
      });

      test('it should handle errors while down transforming', () => {
        const fooTransforms = setup(1);

        v2Tv1Transform.mockImplementation((v2) => {
          return (v2 as any).unknown.split('');
        });

        const { error } = fooTransforms.down({ firstName: 'John', lastName: 'Snow' });

        expect(error!.message).toBe(
          `[Transform error] Cannot read properties of undefined (reading 'split').`
        );
      });
    });
  });

  describe('validate()', () => {
    test('it should validate the object at the specific version', () => {
      const def: ObjectMigrationDefinition = {
        1: {
          schema: schema.string(),
        },
        2: {
          schema: schema.number(),
        },
      };

      // Init transforms for version 1
      let transformsFactory = initTransform(1);
      expect(transformsFactory(def).validate(123)?.message).toBe(
        'expected value of type [string] but got [number]'
      );
      expect(transformsFactory(def).validate('foo')).toBe(null);

      // Can validate another version than the requested one
      expect(transformsFactory(def).validate('foo', 2)?.message).toBe(
        'expected value of type [number] but got [string]'
      );
      expect(transformsFactory(def).validate(123, 2)).toBe(null);

      // Init transform for version 2
      transformsFactory = initTransform(2);
      expect(transformsFactory(def).validate('foo')?.message).toBe(
        'expected value of type [number] but got [string]'
      );
      expect(transformsFactory(def).validate(123)).toBe(null);

      // Init transform for version 7 (invalid)
      transformsFactory = initTransform(7);
      expect(() => {
        transformsFactory(def).validate(123);
      }).toThrowError('Invalid version number [7].');
    });
  });
});
