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
 * The imports in this file are static functions and types which still live in legacy folders and are used
 * within dashboard. To consolidate them all in one place, they are re-exported from this file. Eventually
 * this list should become empty. Imports from the top level of shimmed or moved plugins can be imported
 * directly where they are needed.
 */

export { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
// @ts-ignore
export { KbnUrlProvider, RedirectWhenMissingProvider } from 'ui/url';
export { absoluteToParsedUrl } from 'ui/url/absolute_to_parsed_url';
export { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
export { wrapInI18nContext } from 'ui/i18n';
export { DashboardConstants } from '../dashboard/np_ready/dashboard_constants';
export { VisSavedObject, VISUALIZE_EMBEDDABLE_TYPE } from '../../../visualizations/public/';
export {
  configureAppAngularModule,
  ensureDefaultIndexPattern,
  IPrivate,
  migrateLegacyQuery,
  PrivateProvider,
  PromiseServiceCreator,
} from '../../../../../plugins/kibana_legacy/public';
