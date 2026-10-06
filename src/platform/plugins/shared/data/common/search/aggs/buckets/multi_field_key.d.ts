/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableField } from '../../../serializable_field';
import type { SerializableType } from '../../../serialize_utils';
/**
 * Serialized form of {@link @kbn/data-plugin/common.MultiFieldKey}
 */
export interface SerializedMultiFieldKey {
  type: typeof SerializableType.MultiFieldKey;
  keys: string[];
}
export declare class MultiFieldKey extends SerializableField<SerializedMultiFieldKey> {
  static isInstance(field: unknown): field is MultiFieldKey;
  static deserialize(value: SerializedMultiFieldKey): MultiFieldKey;
  static idBucket(bucket: unknown): string;
  keys: string[];
  constructor(bucket: unknown);
  toString(): string;
  serialize(): SerializedMultiFieldKey;
}
/**
 * Multi-field key separator used in Visualizations (Lens, AggBased, TSVB).
 * This differs from the separator used in the toString method of the MultiFieldKey
 */
export declare const MULTI_FIELD_KEY_SEPARATOR = ' \u203A ';
