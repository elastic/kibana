/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConfigService } from '@kbn/config';
import { config as pathConfig } from '@kbn/utils';

import { config as pluginsConfig } from '../plugins';
import { opsConfig } from '../metrics';
import { config as pidConfig } from '../environment';
import { nodeConfig } from '../node';

import { config as cspConfig } from '../csp';
import { config as elasticsearchConfig } from '../elasticsearch';
import { config as httpConfig } from '../http';
import { config as loggingConfig } from '../logging';
import { config as kibanaConfig } from '../kibana_config';
import { savedObjectsConfig, savedObjectsMigrationConfig } from '../saved_objects';
import { config as uiSettingsConfig } from '../ui_settings';
import { config as statusConfig } from '../status';
import { config as i18nConfig } from '../i18n';
import { ServiceConfigDescriptor } from '../internal_types';
import { config as externalUrlConfig } from '../external_url';

import { coreDeprecationProvider } from './deprecation';

const rootConfigPath = '';

// TODO: This is copied from Server, need to dedupe.
// We probably don't need to do this in the Server if
// it's already handled in the coordinator.
export function setupCoreConfig(configService: ConfigService) {
  const configDescriptors: Array<ServiceConfigDescriptor<unknown>> = [
    pathConfig,
    cspConfig,
    elasticsearchConfig,
    externalUrlConfig,
    loggingConfig,
    httpConfig,
    pluginsConfig,
    kibanaConfig,
    savedObjectsConfig,
    savedObjectsMigrationConfig,
    uiSettingsConfig,
    opsConfig,
    statusConfig,
    pidConfig,
    i18nConfig,
    nodeConfig,
  ];

  configService.addDeprecationProvider(rootConfigPath, coreDeprecationProvider);
  for (const descriptor of configDescriptors) {
    if (descriptor.deprecations) {
      configService.addDeprecationProvider(descriptor.path, descriptor.deprecations);
    }
    configService.setSchema(descriptor.path, descriptor.schema);
  }
}
