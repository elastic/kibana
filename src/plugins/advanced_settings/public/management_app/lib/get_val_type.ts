/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { UiSettingsType } from '../../../../../core/types/ui_settings';
import type { FieldSetting } from '../types';

export function getValType(def: Partial<FieldSetting>, value?: any): UiSettingsType {
  if (def.type) {
    return def.type;
  }

  if (Array.isArray(value) || Array.isArray(def.value)) {
    return 'array';
  }

  const typeofVal = def.value != null ? typeof def.value : typeof value;

  if (typeofVal === 'bigint') {
    return 'number';
  }

  if (typeofVal === 'symbol' || typeofVal === 'object' || typeofVal === 'function') {
    throw new Error(
      `incompatible UiSettingsType: '${def.name}' type ${typeofVal} | ${JSON.stringify(def)}`
    );
  }

  return typeofVal;
}
