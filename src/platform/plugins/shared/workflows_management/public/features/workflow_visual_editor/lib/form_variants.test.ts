/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { blankVariantValue, inferVariant, isBlankVariantValue } from './form_variants';
import { getStepFormSchema } from './step_form_schema';

const variants = (() => {
  const field = getStepFormSchema('while', [])?.fields.find((f) => f.key === 'max-iterations');
  if (!field?.variants) throw new Error('max-iterations should be a choice of shapes');
  return field.variants;
})();
const [number, limit] = variants;

/** Shaped like the Censys targets: one member per `type`, each with its own fields. */
const TARGET_CONNECTOR = {
  type: 'target',
  hasConnectorId: false,
  paramsSchema: z.discriminatedUnion('type', [
    z.object({ type: z.literal('host'), host: z.string() }),
    z.object({ type: z.literal('webproperty'), hostname: z.string(), port: z.number() }),
    z.object({ type: z.literal('certificate'), certificate: z.string() }),
  ]),
  outputSchema: z.unknown(),
  summary: null,
  description: null,
} as unknown as ConnectorContractUnion;
const targets = (() => {
  const field = getStepFormSchema('target', [TARGET_CONNECTOR])?.fields.find(
    (f) => f.key === 'with'
  );
  if (!field?.variants) throw new Error('the target should be a choice of shapes');
  return field.variants;
})();
const [host, webproperty, certificate] = targets;

describe('inferVariant', () => {
  it('picks the variant whose schema accepts the value', () => {
    expect(inferVariant(variants, 10)).toBe(number);
    expect(inferVariant(variants, { limit: 5, 'on-limit': 'fail' })).toBe(limit);
  });

  it('picks the closest object variant for a half-filled value', () => {
    expect(inferVariant(variants, { limit: 5 })).toBe(limit);
  });

  it('is the first variant while there is no value, or nothing fits', () => {
    expect(inferVariant(variants, undefined)).toBe(number);
    expect(inferVariant(variants, 'ten')).toBe(number);
  });

  it('goes by the discriminator a half-filled value carries, not by shared keys', () => {
    // `type` is a key of every variant, so key overlap alone would always say the first one.
    expect(inferVariant(targets, { type: 'certificate' })).toBe(certificate);
    expect(inferVariant(targets, { type: 'webproperty', port: 443 })).toBe(webproperty);
    expect(inferVariant(targets, { type: 'webproperty' })).not.toBe(host);
  });
});

describe('blankVariantValue', () => {
  it('starts an object variant from an empty map and a scalar one from nothing', () => {
    expect(blankVariantValue(limit)).toEqual({});
    expect(blankVariantValue(number)).toBeUndefined();
  });

  it('starts a variant named by a `type` from that `type`', () => {
    expect(blankVariantValue(certificate)).toEqual({ type: 'certificate' });
  });
});

describe('isBlankVariantValue', () => {
  it('is true for a value that is only a variant’s own discriminator', () => {
    expect(isBlankVariantValue(targets, { type: 'host' })).toBe(true);
    expect(isBlankVariantValue(targets, { type: 'host', host: '1.2.3.4' })).toBe(false);
    expect(isBlankVariantValue(targets, { type: 'unknown' })).toBe(false);
    expect(isBlankVariantValue(variants, { limit: 5 })).toBe(false);
  });
});
