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
import 'ui/collapsible_sidebar';
import 'ui/directives/listen';
import 'ui/visualize';
import 'ui/fixed_scroll';
import 'ui/index_patterns';
import 'ui/state_management/app_state';
import 'ui/capabilities/route_setup';

import uiRoutes from 'ui/routes';
export { uiRoutes };
// @ts-ignore
export { uiModules } from 'ui/modules';
export { IndexPatterns } from 'ui/index_patterns';
export { wrapInI18nContext } from 'ui/i18n';
export { timefilter } from 'ui/timefilter';
export { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
export { i18n } from '@kbn/i18n';
export { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
// @ts-ignore
export { callAfterBindingsWorkaround } from 'ui/compat';

import './directives';
