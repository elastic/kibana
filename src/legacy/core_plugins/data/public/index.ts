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

// /// Define plguin function

import { DataPlugin as Plugin } from './plugin';

export function plugin() {
  return new Plugin();
}

// /// Export types

/** @public types */
export { ExpressionRenderer, ExpressionRendererProps, ExpressionRunner } from './expressions';

/** @public types */
export { IndexPattern, StaticIndexPattern, StaticIndexPatternField, Field } from './index_patterns';
export { Query, QueryBar, QueryBarInput } from './query';
export { FilterBar, ApplyFiltersPopover } from './filter';
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
