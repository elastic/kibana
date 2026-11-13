/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from './is_plain_object';
import type { FormVariant } from './step_form_schema';

const hasDiscriminator = (variant: FormVariant, value: Record<string, unknown>): boolean =>
  variant.discriminator !== undefined &&
  value[variant.discriminator.key] === variant.discriminator.value;

/**
 * Which variant a stored value is: the first whose schema accepts it. A half-filled object
 * accepts none, so it goes to the variant whose discriminator it carries (`type: 'host'`), else
 * to the variant sharing the most of its keys; an empty value (or one nothing fits) is the
 * first variant.
 */
export const inferVariant = (variants: readonly FormVariant[], value: unknown): FormVariant => {
  const accepted = variants.find((variant) => variant.schema.safeParse(value).success);
  if (accepted) return accepted;
  if (isPlainObject(value)) {
    const marked = variants.find((variant) => hasDiscriminator(variant, value));
    if (marked) return marked;
    const overlap = (variant: FormVariant) =>
      variant.kind === 'object' ? variant.fields.filter((field) => field.key in value).length : 0;
    const best = variants.reduce((a, b) => (overlap(b) > overlap(a) ? b : a), variants[0]);
    if (overlap(best) > 0) return best;
  }
  return variants[0];
};

/**
 * What switching to a variant starts from: an object variant an empty map (with its
 * discriminator, when it has one), a scalar nothing.
 */
export const blankVariantValue = (variant: FormVariant): Record<string, unknown> | undefined => {
  if (variant.kind !== 'object') return undefined;
  return variant.discriminator ? { [variant.discriminator.key]: variant.discriminator.value } : {};
};

/** A value that is only a variant's own discriminator has not been filled in yet: nothing to replace. */
export const isBlankVariantValue = (variants: readonly FormVariant[], value: unknown): boolean =>
  isPlainObject(value) &&
  Object.keys(value).length === 1 &&
  variants.some((variant) => hasDiscriminator(variant, value));
