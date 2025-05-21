/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import type { ConfigDeprecationProvider, ConfigDeprecationContext } from '@kbn/config';
import { configDeprecationFactory, applyDeprecations } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/config-mocks';

const defaultContext = configDeprecationsMock.createContext();

function collectDeprecations(
  provider: ConfigDeprecationProvider,
  settings: Record<string, any>,
  path: string,
  context: ConfigDeprecationContext = defaultContext
) {
  const deprecations = provider(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const deprecationLevels: string[] = [];
  const { config: migrated } = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path,
      context,
    })),
    () =>
      ({ message, level }) => {
        deprecationMessages.push(message);
        deprecationLevels.push(level ?? '');
      }
  );
  return {
    messages: deprecationMessages,
    levels: deprecationLevels,
    migrated,
  };
}

export const getDeprecationsFor = ({
  provider,
  settings = {},
  path,
}: {
  provider: ConfigDeprecationProvider;
  settings?: Record<string, any>;
  path: string;
}) => {
  return collectDeprecations(provider, set({}, path, settings), path);
};

export const getDeprecationsForGlobalSettings = ({
  provider,
  settings = {},
}: {
  provider: ConfigDeprecationProvider;
  settings?: Record<string, any>;
}) => {
  return collectDeprecations(provider, settings, '');
};
