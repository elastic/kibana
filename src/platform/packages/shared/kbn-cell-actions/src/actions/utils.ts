/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isBoolean, isNumber, isString } from 'lodash/fp';
import type { Serializable, SerializableArray } from '@kbn/utility-types/src/serializable';
import type { DefaultActionsSupportedValue, NonNullableSerializable } from './types';

export const SUPPORTED_KBN_TYPES = [
  KBN_FIELD_TYPES.DATE,
  KBN_FIELD_TYPES.IP,
  KBN_FIELD_TYPES.STRING,
  KBN_FIELD_TYPES.NUMBER,
  KBN_FIELD_TYPES.BOOLEAN,
];

export const isTypeSupportedByDefaultActions = (kbnFieldType: KBN_FIELD_TYPES) =>
  SUPPORTED_KBN_TYPES.includes(kbnFieldType);

const isNonMixedTypeArray = (
  value: Array<string | number | boolean>
): value is string[] | number[] | boolean[] => value.every((v) => typeof v === typeof value[0]);

export const isValueSupportedByDefaultActions = (
  value: NonNullableSerializable[]
): value is DefaultActionsSupportedValue =>
  value.every((v): v is string | number | boolean => isString(v) || isNumber(v) || isBoolean(v)) &&
  isNonMixedTypeArray(value);

export const filterOutNullableValues = (value: SerializableArray): NonNullableSerializable[] =>
  value.filter<NonNullableSerializable>((v): v is NonNullableSerializable => v != null);

export const valueToArray = (value: Serializable): SerializableArray =>
  Array.isArray(value) ? value : [value];
