/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Alias for unknown raw field value, could be instance of a field Class
 */
export type RawValue = number | string | unknown;

/**
 * Class to extends that enabled serializing and deserializing instance values
 */
export abstract class SerializableField<S> {
  static isSerializable<T>(field: RawValue): field is SerializableField<T> {
    return Boolean((field as SerializableField<T>).serialize);
  }

  /**
   * Serializes the class instance to a known `SerializedValue` that can be used to instantiate a new instance
   *
   * Ideally this returns the same params as found in the constructor.
   */
  abstract serialize(): S;

  /**
   * typescript forbids abstract static methods but this is a workaround to require it
   *
   * @param serializedValue type of `SerializedValue`
   * @returns `instanceValue` should same type as instantiating class
   */
  static deserialize(serializedValue: unknown): unknown {
    throw new Error(
      'Must implement a static `deserialize` method to conform to /`SerializableField/`'
    );
  }
}
