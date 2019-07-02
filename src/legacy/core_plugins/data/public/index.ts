/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Data Plugin - public
 *
 * This is the entry point for the entire client-side public contract of the plugin.
 * If something is not explicitly exported here, you can safely assume it is private
 * to the plugin and not considered stable.
 *
 * All stateful contracts will be injected by the platform at runtime, and are defined
 * in the setup/start interfaces. The remaining items exported here are either types,
 * or static code.
 */
import { PluginInitializer } from 'kibana/public';
import {
  DataPublicPlugin,
  DataSetup,
  DataSetupPlugins,
  DataStart,
  DataStartPlugins,
} from './plugin';

// This is what Core looks for when loading our plugin
export const plugin: PluginInitializer<
  DataSetup,
  DataStart,
  DataSetupPlugins,
  DataStartPlugins
> = initializerContext => {
  return new DataPublicPlugin();
};

/** @public interfaces for stateful services */
export { DataSetup };

/** @public types */
export { ExpressionRenderer, ExpressionRendererProps, ExpressionRunner } from './expressions';
export { IndexPattern, StaticIndexPattern, StaticIndexPatternField, Field } from './index_patterns';
export { Query } from './query';
export { FilterManager, FilterStateManager, uniqFilters } from './filter/filter_manager';

/** @public static code */
export { dateHistogramInterval } from '../common/date_histogram_interval';
/** @public static code */
export {
  isValidEsInterval,
  InvalidEsCalendarIntervalError,
  InvalidEsIntervalFormatError,
  parseEsInterval,
  ParsedInterval,
} from '../common/parse_es_interval';
