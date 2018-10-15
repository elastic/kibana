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

import '../saved_visualizations/saved_visualizations';
import 'ui/directives/saved_object_finder';
import 'ui/directives/paginated_selectable_list';
import '../../discover/saved_searches/saved_searches';

import { DashboardConstants } from '../../dashboard/dashboard_constants';
import { VisualizeConstants } from '../visualize_constants';
import routes from 'ui/routes';
import { uiModules } from 'ui/modules';
import visualizeWizardStep2Template from './step_2.html';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { timefilter } from 'ui/timefilter';

const module = uiModules.get('app/visualize', ['kibana/courier']);

/********
/** Wizard Step 2
/********/

// Redirect old route to new route.
// NOTE: Accessing this route directly means the user has entered into the wizard UX without
// selecting a Visualization type in step 1. So we want to redirect them to step 1, not step 2.
routes.when('/visualize/step/2', {
  redirectTo: VisualizeConstants.WIZARD_STEP_1_PAGE_PATH,
});

routes.when(VisualizeConstants.WIZARD_STEP_2_PAGE_PATH, {
  template: visualizeWizardStep2Template,
  controller: 'VisualizeWizardStep2',
  resolve: {
    indexPatterns: function (Private) {
      const savedObjectsClient = Private(SavedObjectsClientProvider);

      return savedObjectsClient.find({
        type: 'index-pattern',
        fields: ['title'],
        perPage: 10000
      }).then(response => response.savedObjects);
    }
  }
});

module.controller('VisualizeWizardStep2', function ($route, $scope, kbnUrl) {
  const type = $route.current.params.type;
  const addToDashMode = $route.current.params[DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM];
  kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);

  $scope.step2WithSearchUrl = function (hit) {
    if (addToDashMode) {
      return kbnUrl.eval(
        `#${VisualizeConstants.CREATE_PATH}` +
        `?type={{type}}&savedSearchId={{id}}` +
        `&${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}`,
        { type: type, id: hit.id }
      );
    }

    return kbnUrl.eval(
      `#${VisualizeConstants.CREATE_PATH}?type={{type}}&savedSearchId={{id}}`,
      { type: type, id: hit.id }
    );
  };

  timefilter.disableAutoRefreshSelector();
  timefilter.disableTimeRangeSelector();

  $scope.indexPattern = {
    selection: null,
    list: $route.current.locals.indexPatterns
  };

  $scope.makeUrl = function (pattern) {
    if (!pattern) return;

    if (addToDashMode) {
      return `#${VisualizeConstants.CREATE_PATH}` +
        `?${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}` +
        `&type=${type}&indexPattern=${pattern.id}`;
    }

    return `#${VisualizeConstants.CREATE_PATH}?type=${type}&indexPattern=${pattern.id}`;
  };
});
