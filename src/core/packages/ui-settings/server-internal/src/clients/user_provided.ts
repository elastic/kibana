/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';

export type UserProvided<T = unknown> = Record<string, UserProvidedValues<T>>;

interface ScopeDefinitions {
  defaults: Record<string, UiSettingsParams>;
  overrides: Record<string, unknown>;
}

export const validateUserValue = (
  defaults: Record<string, UiSettingsParams>,
  key: string,
  value: unknown
): void => {
  const definition = defaults[key];
  if (value === null || definition === undefined) return;
  if (definition.schema) {
    definition.schema.validate(value, {}, `validation [${key}]`);
  }
};

export const parseUserProvided = (
  attributes: Record<string, unknown>,
  { defaults, overrides }: ScopeDefinitions,
  log: Logger
): UserProvided => {
  // validate value read from saved objects as it can be changed via SO API
  const userProvided: UserProvided = {};
  for (const [key, userValue] of Object.entries(attributes)) {
    if (userValue === null || Object.hasOwn(overrides, key)) continue;
    try {
      validateUserValue(defaults, key, userValue);
      userProvided[key] = { userValue };
    } catch (error) {
      log.warn(`Ignore invalid UiSettings value. ${error}.`);
    }
  }
  return userProvided;
};

export const overridesAsUserProvided = (overrides: Record<string, unknown>): UserProvided =>
  Object.fromEntries(
    Object.entries(overrides).map(([key, value]) => [
      key,
      value === null ? { isOverridden: true } : { isOverridden: true, userValue: value },
    ])
  );
