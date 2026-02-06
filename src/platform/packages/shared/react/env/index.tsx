/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCoreEnv } from '@kbn/react-kibana-context-env';

/**
 * Hook to determine if Kibana is running in serverless mode
 */
export const useIsServerless = (): boolean => {
  const env = useCoreEnv();
  return env.packageInfo.buildFlavor === 'serverless';
};

/**
 * Hook to get the current Kibana version
 */
export const useKibanaVersion = (): string => {
  const env = useCoreEnv();
  return env.packageInfo.version;
};

/**
 * Hook to determine if Kibana is running in dev mode
 */
export const useIsDevMode = (): boolean => {
  const env = useCoreEnv();
  return env.mode.dev;
};
