/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { WidgetType } from './widgets';

/** Utility type to strip form-specific props (value, onChange, onBlur) from EUI component props */
export type StripFormProps<T> = Partial<Omit<T, 'value' | 'onChange' | 'onBlur'>>;

export interface BaseMetadata {
  widget?: WidgetType | string;
  label?: string;
  placeholder?: string;
  default?: unknown;
  helpText?: string;
  isDisabled?: boolean;
}

// Allow additional properties while maintaining type safety for known properties
declare module '@kbn/zod/v4' {
  interface GlobalMeta extends BaseMetadata {
    [key: string]: unknown;
  }
}

export function getMeta(schema: z.ZodTypeAny): BaseMetadata | undefined {
  return z.globalRegistry.get(schema) as BaseMetadata | undefined;
}
