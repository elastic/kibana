/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Fixture for no_eso_registration_dotted_attribute_keys — mirrors the shape of
// the synthetics monitor config keys: an enum whose values mix flat and dotted
// names, plus constant arrays built from those enum members.

export enum ConfigKey {
  ENABLED = 'enabled',
  NAME = 'name',
  PASSWORD = 'password',
  USERNAME = 'username',
  TLS_KEY = 'ssl.key',
  TLS_CERTIFICATE = 'ssl.certificate',
  SOURCE_INLINE = 'source.inline.script',
}

export const secretKeys = [
  ConfigKey.PASSWORD,
  ConfigKey.USERNAME,
  ConfigKey.TLS_KEY,
  ConfigKey.SOURCE_INLINE,
] as const;

export const flatKeys = [ConfigKey.ENABLED, ConfigKey.NAME] as const;

export const dottedSet = new Set([ConfigKey.TLS_CERTIFICATE]);
