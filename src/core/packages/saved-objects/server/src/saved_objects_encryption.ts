/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @public
 */
export type EsoAadVersion = '1'; // in the future '1'|'2'|'3', etc.

/**
 * Describes the attributes to encrypt. By default, attribute values won't be exposed to end-users
 * and can only be consumed by the internal Kibana server. If end-users should have access to the
 * encrypted values use `dangerouslyExposeValue: true`
 * @public
 */
export interface AttributeToEncrypt {
  readonly key: string;
  readonly dangerouslyExposeValue?: boolean;
}

/**
 * @public
 */
export interface SavedObjectsEncryptionDefinition {
  readonly attributesToEncrypt: ReadonlySet<string | AttributeToEncrypt>;
  readonly attributesToIncludeInAAD?: ReadonlySet<string>;
  readonly esoAADVersion?: EsoAadVersion;
}

/**
 * Configuration options for the {@link SavedObjectsType | type}'s encryption section.
 *
 * @public
 */
export interface SavedObjectsTypeEncryptionOptions {
  /**
   * Whether or not to enforce a random unique id for this type. Defaults to true.
   */
  enforceRandomId?: boolean;
  /**
   * When specified, will be used as the default encryption defition for this type.
   */
  definition?: SavedObjectsEncryptionDefinition;
}
