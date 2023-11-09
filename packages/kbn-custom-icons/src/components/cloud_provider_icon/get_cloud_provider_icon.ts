/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const CLOUD_PROVIDER_ICONS = {
  gcp: 'logoGCP',
  aws: 'logoAWS',
  azure: 'logoAzure',
  unknownProvider: 'cloudSunny',
} as const;

export type CloudProvider = keyof typeof CLOUD_PROVIDER_ICONS;

export function getCloudProviderIcon(cloudProvider: string | undefined) {
  return (
    (cloudProvider && CLOUD_PROVIDER_ICONS[cloudProvider as CloudProvider]) ||
    CLOUD_PROVIDER_ICONS.unknownProvider
  );
}
