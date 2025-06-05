/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableField } from '../../../serializable_field';
import { SerializableType } from '../../../serialize_utils';

/**
 * Serialized form of {@link @kbn/data-plugin/common.MultiFieldKey}
 */
export interface SerializedMultiFieldKey {
  type: typeof SerializableType.MultiFieldKey;
  keys: string[];
}

const isBucketLike = (bucket: unknown): bucket is { key: unknown } => {
  return Boolean(bucket && typeof bucket === 'object' && 'key' in bucket);
};

function getKeysFromBucket(bucket: unknown) {
  if (!isBucketLike(bucket)) {
    throw new Error('bucket malformed - no key found');
  }
  return Array.isArray(bucket.key) ? bucket.key.map(String) : [String(bucket.key)];
}

export class MultiFieldKey extends SerializableField<SerializedMultiFieldKey> {
  static isInstance(field: unknown): field is MultiFieldKey {
    return field instanceof MultiFieldKey;
  }

  static deserialize(value: SerializedMultiFieldKey): MultiFieldKey {
    return new MultiFieldKey({
      key: value.keys, // key here is to keep bwc with constructor params
    });
  }

  static idBucket(bucket: unknown): string {
    return getKeysFromBucket(bucket).join(',');
  }

  keys: string[];

  constructor(bucket: unknown) {
    super();
    this.keys = getKeysFromBucket(bucket);
  }

  toString(): string {
    return this.keys.join(',');
  }

  serialize(): SerializedMultiFieldKey {
    return {
      type: SerializableType.MultiFieldKey,
      keys: this.keys,
    };
  }
}

/**
 * Multi-field key separator used in Visualizations (Lens, AggBased, TSVB).
 * This differs from the separator used in the toString method of the MultiFieldKey
 */
export const MULTI_FIELD_KEY_SEPARATOR = ' › ';
