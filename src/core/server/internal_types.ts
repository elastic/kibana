/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Type } from '@kbn/config-schema';

import { CapabilitiesSetup, CapabilitiesStart } from './capabilities';
import { ConfigDeprecationProvider } from './config';
import { InternalContextPreboot, ContextSetup } from './context';
import {
  InternalElasticsearchServicePreboot,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from './elasticsearch';
import {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
  InternalHttpServiceStart,
} from './http';
import {
  InternalSavedObjectsServiceSetup,
  InternalSavedObjectsServiceStart,
} from './saved_objects';
import {
  InternalUiSettingsServicePreboot,
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
} from './ui_settings';
import { InternalEnvironmentServiceSetup } from './environment';
import { InternalMetricsServiceSetup, InternalMetricsServiceStart } from './metrics';
import { InternalRenderingServiceSetup } from './rendering';
import { InternalHttpResourcesPreboot, InternalHttpResourcesSetup } from './http_resources';
import { InternalStatusServiceSetup } from './status';
import { InternalLoggingServicePreboot, InternalLoggingServiceSetup } from './logging';
import { CoreUsageDataStart, InternalCoreUsageDataSetup } from './core_usage_data';
import { I18nServiceSetup } from './i18n';
import { InternalDeprecationsServiceSetup, InternalDeprecationsServiceStart } from './deprecations';
import type {
  InternalExecutionContextSetup,
  InternalExecutionContextStart,
} from './execution_context';
import { InternalPrebootServicePreboot } from './preboot';
import { DocLinksServiceSetup, DocLinksServiceStart } from './doc_links';

/** @internal */
export interface InternalCorePreboot {
  context: InternalContextPreboot;
  http: InternalHttpServicePreboot;
  elasticsearch: InternalElasticsearchServicePreboot;
  uiSettings: InternalUiSettingsServicePreboot;
  httpResources: InternalHttpResourcesPreboot;
  logging: InternalLoggingServicePreboot;
  preboot: InternalPrebootServicePreboot;
}

/** @internal */
export interface InternalCoreSetup {
  capabilities: CapabilitiesSetup;
  context: ContextSetup;
  docLinks: DocLinksServiceSetup;
  http: InternalHttpServiceSetup;
  elasticsearch: InternalElasticsearchServiceSetup;
  executionContext: InternalExecutionContextSetup;
  i18n: I18nServiceSetup;
  savedObjects: InternalSavedObjectsServiceSetup;
  status: InternalStatusServiceSetup;
  uiSettings: InternalUiSettingsServiceSetup;
  environment: InternalEnvironmentServiceSetup;
  rendering: InternalRenderingServiceSetup;
  httpResources: InternalHttpResourcesSetup;
  logging: InternalLoggingServiceSetup;
  metrics: InternalMetricsServiceSetup;
  deprecations: InternalDeprecationsServiceSetup;
  coreUsageData: InternalCoreUsageDataSetup;
}

/**
 * @internal
 */
export interface InternalCoreStart {
  capabilities: CapabilitiesStart;
  elasticsearch: InternalElasticsearchServiceStart;
  docLinks: DocLinksServiceStart;
  http: InternalHttpServiceStart;
  metrics: InternalMetricsServiceStart;
  savedObjects: InternalSavedObjectsServiceStart;
  uiSettings: InternalUiSettingsServiceStart;
  coreUsageData: CoreUsageDataStart;
  executionContext: InternalExecutionContextStart;
  deprecations: InternalDeprecationsServiceStart;
}

/**
 * @internal
 */
export interface ServiceConfigDescriptor<T = any> {
  path: string;
  /**
   * Schema to use to validate the configuration.
   */
  schema: Type<T>;
  /**
   * Provider for the {@link ConfigDeprecation} to apply to the plugin configuration.
   */
  deprecations?: ConfigDeprecationProvider;
}
