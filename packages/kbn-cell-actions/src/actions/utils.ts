/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isBoolean, isNumber, isString } from 'lodash/fp';
import { Serializable } from '@kbn/utility-types';
import { DefaultActionsPrimitiveValue } from './types';

export const SUPPORTED_KBN_TYPES = [
  KBN_FIELD_TYPES.DATE,
  KBN_FIELD_TYPES.IP,
  KBN_FIELD_TYPES.STRING,
  KBN_FIELD_TYPES.NUMBER,
  KBN_FIELD_TYPES.BOOLEAN,
];

export const isTypeSupportedByDefaultActions = (kbnFieldType: KBN_FIELD_TYPES) =>
  SUPPORTED_KBN_TYPES.includes(kbnFieldType);

export const isNonNullablePrimitiveValue = (
  value: Serializable
): value is DefaultActionsPrimitiveValue => isString(value) || isNumber(value) || isBoolean(value);

export const isPrimitiveValue = (value: Serializable): value is DefaultActionsPrimitiveValue =>
  value == null || isNonNullablePrimitiveValue(value);

/**
 * Unfortunately, we can't create type guards for this function because `SerializableArray`
 * is an interface that extends Array, which is incompatible with `Array<number | boolean | string>`.
 *
 * Whenever this function returns true, the value is guaranteed to be a `DefaultActionsSupportedValue`.
 */
export const isValueSupportedByDefaultActions = (value: Serializable) =>
  isPrimitiveValue(value) || (Array.isArray(value) && value.every(isNonNullablePrimitiveValue));
