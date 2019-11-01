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

import { ToastNotifications } from 'ui/notify/toasts/toast_notifications';
import {
  ChromeStart,
  DocLinksStart,
  SavedObjectsClientContract,
  UiSettingsClientContract,
} from 'kibana/public';

// load directives
import '../../../data/public';

// @ts-ignore
import { SavedObjectProvider } from 'ui/saved_objects/saved_object';
import { EmbeddablePublicPlugin } from '../../../../../plugins/embeddable/public';
import { SavedVisualizations } from './types';

export interface VisualizeKibanaServices {
  addBasePath: (url: string) => string;
  angular: any;
  chrome: ChromeStart;
  config: any;
  dataStart: any;
  docLinks: DocLinksStart;
  embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
  getBasePath: () => string;
  getInjected: (name: string, defaultValue?: any) => unknown;
  FeatureCatalogueRegistryProvider: any;
  indexPatterns: any;
  toastNotifications: ToastNotifications;
  savedObjectsClient: SavedObjectsClientContract;
  savedVisualizations: SavedVisualizations;
  uiSettings: UiSettingsClientContract;
  visualizeCapabilities: any;
  visualizations: any;
}

let services: VisualizeKibanaServices | null = null;
export function setServices(newServices: VisualizeKibanaServices) {
  if (services) {
    throw new Error(
      'Kibana services already set - are you trying to import this module from outside of the home app?'
    );
  }
  services = newServices;
}

export function getServices() {
  if (!services) {
    throw new Error(
      'Kibana services not set - are you trying to import this module from outside of the home app?'
    );
  }
  return services;
}

export function clearServices() {
  services = null;
}

// export types
export { DocTitle } from 'ui/doc_title/doc_title';

// export legacy static dependencies
export { ensureDefaultIndexPattern } from 'ui/legacy_compat';

export { getFromSavedObject } from 'ui/index_patterns';
export { PersistedState } from 'ui/persisted_state';
// @ts-ignore
export { getUnhashableStatesProvider } from 'ui/state_management/state_hashing';
export { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
export { showShareContextMenu } from 'ui/share';
export { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
export { absoluteToParsedUrl } from 'ui/url/absolute_to_parsed_url';
export { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
export { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
export { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
export { getVisualizeLoader } from 'ui/visualize/loader';
export { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
export {
  Container,
  Embeddable,
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
} from '../../../../../plugins/embeddable/public';

// export types
export { StaticIndexPattern } from 'ui/index_patterns';
export { AppState } from 'ui/state_management/app_state';
export { VisType } from 'ui/vis';
export { VisualizeLoader } from 'ui/visualize/loader';
export {
  VisSavedObject,
  VisualizeLoaderParams,
  VisualizeUpdateParams,
} from 'ui/visualize/loader/types';

export { METRIC_TYPE, createUiStatsReporter } from '../../../ui_metric/public';

// export const
export { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
