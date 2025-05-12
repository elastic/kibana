/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MultiFieldKey, RangeKey, SerializedRangeKey } from './search';
import { SerializedMultiFieldKey } from './search/aggs/buckets/multi_field_key';
import { RawValue, SerializableField } from './serializable_field';

/**
 * All available serialized forms of complex/instance fields. Excludes non-complex/primitive fields.
 *
 * Use `SerializedValue` for all generalize serial values which includes non-complex/primitive fields.
 *
 * Currently includes:
 * - `RangeKey`
 * - `MultiFieldKey`
 */
export type SerializedField = SerializedMultiFieldKey | SerializedRangeKey;

/**
 * Alias for unknown serialized value. This value is what we store in the SO and app state
 * to persist the color assignment based on the raw row value.
 *
 * In most cases this is a `string` or `number` or plain `object`, in other cases this is an
 * object serialized from an instance of a given field (i.e. `RangeKey` or `MultiFieldKey`).
 */
export type SerializedValue = number | string | SerializedField | unknown;

export const SerializableType = {
  MultiFieldKey: 'multiFieldKey' as const,
  RangeKey: 'rangeKey' as const,
};

export function deserializeField(field: SerializedValue) {
  const type = field != null && (field as any)?.type;

  switch (type) {
    case SerializableType.MultiFieldKey:
      return MultiFieldKey.deserialize(field as SerializedMultiFieldKey);
    case SerializableType.RangeKey:
      return RangeKey.deserialize(field as SerializedRangeKey);
    default:
      return field;
  }
}

export function serializeField(field: RawValue): SerializedValue {
  if (field == null || !SerializableField.isSerializable(field)) return field;
  return field.serialize();
}
