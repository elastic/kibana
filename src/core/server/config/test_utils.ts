/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { set } from '@elastic/safer-lodash-set';
import type { ConfigDeprecationProvider } from '@kbn/config';
import { configDeprecationFactory, applyDeprecations } from '@kbn/config';

function collectDeprecations(
  provider: ConfigDeprecationProvider,
  settings: Record<string, any>,
  path: string
) {
  const deprecations = provider(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const { config: migrated } = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path,
    })),
    () => ({ message }) => deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
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
