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

import _ from 'lodash';
import { CATEGORY, CATEGORY_DISPLAY_NAMES } from 'ui/vis/vis_category';
import { DashboardConstants } from '../../dashboard/dashboard_constants';
import { VisualizeConstants } from '../visualize_constants';
import routes from 'ui/routes';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { uiModules } from 'ui/modules';
import visualizeWizardStep1Template from './step_1.html';
import visualizeWizardStep2Template from './step_2.html';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { timefilter } from 'ui/timefilter';

const module = uiModules.get('app/visualize', ['kibana/courier']);

/********
/** Wizard Step 1
/********/

// Redirect old route to new route.
routes.when('/visualize/step/1', {
  redirectTo: VisualizeConstants.WIZARD_STEP_1_PAGE_PATH,
});

routes.when(VisualizeConstants.WIZARD_STEP_1_PAGE_PATH, {
  template: visualizeWizardStep1Template,
  controller: 'VisualizeWizardStep1',
});

module.controller('VisualizeWizardStep1', function ($scope, $route, kbnUrl, Private, config) {
  timefilter.disableAutoRefreshSelector();
  timefilter.disableTimeRangeSelector();

  const addToDashMode = $route.current.params[DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM];
  kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);

  const visTypes = Private(VisTypesRegistryProvider);
  const isLabsEnabled = config.get('visualize:enableLabs');
  $scope.toggleLabView = () => {
    $route.current.params.lab = !$route.current.params.lab;
    $route.updateParams($route.current.params);
    $route.reload();
  };

  const categoryToVisTypesMap = {};

  visTypes.forEach(visType => {

    let categoryName = visType.category;

    if (categoryName === CATEGORY.HIDDEN) {
      return;
    }

    if (!isLabsEnabled && visType.stage === 'lab') {
      return;
    }

    // If the specified category doesn't have a value in our display names
    // mapping (most likely because the vis specified a random category, not using
    // CATEGORY values), just move it to the OTHER category.
    if (!CATEGORY_DISPLAY_NAMES[categoryName]) {
      categoryName = CATEGORY.OTHER;
    }

    // Create category object if it doesn't exist yet.
    if (!categoryToVisTypesMap[categoryName]) {
      categoryToVisTypesMap[categoryName] = {
        label: CATEGORY_DISPLAY_NAMES[categoryName],
        list: [],
      };
    }

    const categoryVisTypes = categoryToVisTypesMap[categoryName];

    // Add the visType to the list and sort them by their title.
    categoryVisTypes.list = _.sortBy(
      categoryVisTypes.list.concat(visType),
      type => type.title
    );
  });

  // Sort the categories alphabetically.
  const sortedVisTypeCategories = Object.values(categoryToVisTypesMap).sort((a, b) => {
    const other = CATEGORY.OTHER.toLowerCase();

    // Put "other" category at the end of the list.
    const labelA = a.label.toLowerCase();
    if (labelA === other) return 1;

    const labelB = b.label.toLowerCase();
    if (labelB === other) return -1;

    if (labelA < labelB) return -1;
    if (labelA > labelB) return 1;
    return 0;
  });

  $scope.searchTerm = '';

  $scope.filteredVisTypeCategories = [];

  $scope.$watch('searchTerm', () => {
    function getVisTypeCategories() {
      const normalizedSearchTerm = $scope.searchTerm.toLowerCase().trim();

      const filteredVisTypeCategories = sortedVisTypeCategories.map(category => {
        // Include entire category if the category matches the search term.
        if (category.label.toLowerCase().includes(normalizedSearchTerm)) {
          return category;
        }

        // Otherwise, return just the vis types in the category which match.
        const filteredVisTypes = category.list.filter(visType => {
          return visType.title.toLowerCase().includes(normalizedSearchTerm);
        });

        return {
          label: category.label,
          list: filteredVisTypes,
        };
      });

      return filteredVisTypeCategories.filter(category => category.list.length);
    }

    $scope.filteredVisTypeCategories = getVisTypeCategories();
  });

  $scope.getVisTypeId = type => {
    return _.camelCase(type.name);
  };

  $scope.getVisTypeTooltip = type => {
    //to not clutter the tooltip, just only notify if labs or experimental.
    //labs is more important in this regard.
    let prefix = '';
    if (type.stage === 'lab') {
      prefix = '(Lab)';
    } else if (type.stage === 'experimental') {
      prefix = '(Experimental)';
    }
    return `${prefix} ${type.description}`;
  };

  $scope.getVisTypeTooltipPosition = index => {
    // Tooltips should appear on the bottom by default, unless they're on the last row. This is a
    // cheap workaround to automatically positioning the tooltip so that it won't disappear off
    // the edge of the screen.
    if (index === $scope.filteredVisTypeCategories.length - 1) {
      return 'top';
    }

    return 'bottom';
  };

  $scope.getVisTypeUrl = function (visType) {
    const baseUrl =
      visType.requiresSearch && visType.options.showIndexSelection
        ? `#${VisualizeConstants.WIZARD_STEP_2_PAGE_PATH}?`
        : `#${VisualizeConstants.CREATE_PATH}?`;

    const params = [`type=${encodeURIComponent(visType.name)}`];

    if (addToDashMode) {
      params.push(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);
    }

    return baseUrl + params.join('&');
  };
});

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
