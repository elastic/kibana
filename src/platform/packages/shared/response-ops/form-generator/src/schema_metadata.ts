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
  widget: WidgetType;
  label?: string;
  placeholder?: string;
  default?: unknown;
  helpText?: string;
  isDisabled?: boolean;
  [key: string]: unknown;
}

declare module '@kbn/zod/v4' {
  interface GlobalMeta extends Partial<BaseMetadata> {
    // Allow any additional properties for flexibility
    [key: string]: unknown;
  }
}

export function createWidgetTypeGuard<T extends { widget: WidgetType }>(
  widgetType: WidgetType
): (meta: unknown) => meta is T {
  return (meta): meta is T =>
    typeof meta === 'object' && meta !== null && 'widget' in meta && meta.widget === widgetType;
}

export function getMeta(schema: z.ZodTypeAny): z.GlobalMeta | undefined {
  return z.globalRegistry.get(schema);
}
