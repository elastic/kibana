/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ConfigDeprecationProvider } from '@kbn/config';
import { Type } from '@kbn/config-schema';
import type { CapabilitiesSetup, CapabilitiesStart } from './capabilities/capabilities_service';
import type { ContextSetup, InternalContextPreboot } from './context/context_service';
import type { CoreUsageDataStart } from './core_usage_data/types';
import type {
  InternalDeprecationsServiceSetup,
  InternalDeprecationsServiceStart,
} from './deprecations/deprecations_service';
import type {
  InternalElasticsearchServicePreboot,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from './elasticsearch/types';
import type { InternalEnvironmentServiceSetup } from './environment/environment_service';
import type {
  InternalExecutionContextSetup,
  InternalExecutionContextStart,
} from './execution_context/execution_context_service';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
  InternalHttpServiceStart,
} from './http/types';
import type {
  InternalHttpResourcesPreboot,
  InternalHttpResourcesSetup,
} from './http_resources/types';
import type { I18nServiceSetup } from './i18n/i18n_service';
import type {
  InternalLoggingServicePreboot,
  InternalLoggingServiceSetup,
} from './logging/logging_service';
import type { InternalMetricsServiceSetup, InternalMetricsServiceStart } from './metrics/types';
import type { InternalPrebootServicePreboot } from './preboot/types';
import type { InternalRenderingServiceSetup } from './rendering/types';
import type {
  InternalSavedObjectsServiceSetup,
  InternalSavedObjectsServiceStart,
} from './saved_objects/saved_objects_service';
import type { InternalStatusServiceSetup } from './status/types';
import type {
  InternalUiSettingsServicePreboot,
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
} from './ui_settings/types';

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
}

/**
 * @internal
 */
export interface InternalCoreStart {
  capabilities: CapabilitiesStart;
  elasticsearch: InternalElasticsearchServiceStart;
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
