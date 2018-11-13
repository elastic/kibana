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

import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';
import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';
import { i18n } from '@kbn/i18n';

import { VisualizeListingTable } from './visualize_listing_table';

const app = uiModules.get('app/visualize', ['ngRoute', 'react']);
app.directive('visualizeListingTable', function (reactDirective) {
  return reactDirective(VisualizeListingTable);
});

export function VisualizeListingController($injector) {
  const Notifier = $injector.get('Notifier');
  const Private = $injector.get('Private');
  const config = $injector.get('config');
  const breadcrumbState = $injector.get('breadcrumbState');

  timefilter.disableAutoRefreshSelector();
  timefilter.disableTimeRangeSelector();

  // TODO: Extract this into an external service.
  const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
  const visualizationService = services.visualizations;
  const notify = new Notifier({ location: 'Visualize' });

  this.fetchItems = (filter) => {
    const isLabsEnabled = config.get('visualize:enableLabs');
    return visualizationService.find(filter, config.get('savedObjects:listingLimit'))
      .then(result => {
        this.totalItems = result.total;
        this.showLimitError = result.total > config.get('savedObjects:listingLimit');
        this.listingLimit = config.get('savedObjects:listingLimit');
        return result.hits.filter(result => (isLabsEnabled || result.type.stage !== 'lab'));
      });
  };

  this.deleteSelectedItems = function deleteSelectedItems(selectedIds) {
    return visualizationService.delete(selectedIds)
      .catch(error => notify.error(error));
  };

  breadcrumbState.set([{
    text: i18n.translate('kbn.visualize.visualizeListingBreadcrumbsTitle', {
      defaultMessage: 'Visualize',
    })
  }]);
  config.watch('k7design', (val) => this.showPluginBreadcrumbs = !val);
}
