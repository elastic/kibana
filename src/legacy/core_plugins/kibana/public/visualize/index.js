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

import { ensureDefaultIndexPattern } from 'ui/legacy_compat';
import './editor/editor';
import { i18n } from '@kbn/i18n';
import './saved_visualizations/_saved_vis';
import './saved_visualizations/saved_visualizations';
import visualizeListingTemplate from './listing/visualize_listing.html';
import { VisualizeListingController } from './listing/visualize_listing';
import { VisualizeConstants } from './visualize_constants';
import { getLandingBreadcrumbs, getWizardStep1Breadcrumbs } from './breadcrumbs';

import { getServices, FeatureCatalogueCategory } from './kibana_services';

const { FeatureCatalogueRegistryProvider, uiRoutes } = getServices();

uiRoutes
  .defaults(/visualize/, {
    requireUICapability: 'visualize.show',
    badge: uiCapabilities => {
      if (uiCapabilities.visualize.save) {
        return undefined;
      }

      return {
        text: i18n.translate('kbn.visualize.badge.readOnly.text', {
          defaultMessage: 'Read only',
        }),
        tooltip: i18n.translate('kbn.visualize.badge.readOnly.tooltip', {
          defaultMessage: 'Unable to save visualizations',
        }),
        iconType: 'glasses'
      };
    }
  })
  .when(VisualizeConstants.LANDING_PAGE_PATH, {
    template: visualizeListingTemplate,
    k7Breadcrumbs: getLandingBreadcrumbs,
    controller: VisualizeListingController,
    controllerAs: 'listingController',
    resolve: {
      createNewVis: () => false,
      hasDefaultIndex: ($rootScope, kbnUrl) => ensureDefaultIndexPattern(getServices().core, getServices().data, $rootScope, kbnUrl)
    },
  })
  .when(VisualizeConstants.WIZARD_STEP_1_PAGE_PATH, {
    template: visualizeListingTemplate,
    k7Breadcrumbs: getWizardStep1Breadcrumbs,
    controller: VisualizeListingController,
    controllerAs: 'listingController',
    resolve: {
      createNewVis: () => true,
      hasDefaultIndex: ($rootScope, kbnUrl) => ensureDefaultIndexPattern(getServices().core, getServices().data, $rootScope, kbnUrl)
    },
  });

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'visualize',
    title: 'Visualize',
    description: i18n.translate(
      'kbn.visualize.visualizeDescription',
      {
        defaultMessage: 'Create visualizations and aggregate data stores in your Elasticsearch indices.',
      }
    ),
    icon: 'visualizeApp',
    path: `/app/kibana#${VisualizeConstants.LANDING_PAGE_PATH}`,
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
