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

import { management } from 'ui/management';
import { IndexPatternListFactory } from 'ui/management/index_pattern_list';
import { IndexPatternCreationFactory } from 'ui/management/index_pattern_creation';
import './create_index_pattern_wizard';
import './edit_index_pattern';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from './index.html';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { IndexPatternList } from './index_pattern_list';

const INDEX_PATTERN_LIST_DOM_ELEMENT_ID = 'indexPatternListReact';

export function updateIndexPatternList(
  $scope,
  indexPatternCreationOptions,
  defaultIndex,
  indexPatterns,
) {
  const node = document.getElementById(INDEX_PATTERN_LIST_DOM_ELEMENT_ID);
  if (!node) {
    return;
  }

  render(
    <I18nProvider>
      <IndexPatternList
        indexPatternCreationOptions={indexPatternCreationOptions}
        defaultIndex={defaultIndex}
        indexPatterns={indexPatterns}
      />
    </I18nProvider>,
    node,
  );
}

export const destroyIndexPatternList = () => {
  const node = document.getElementById(INDEX_PATTERN_LIST_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
};

const indexPatternsResolutions = {
  indexPatterns: function (Private) {
    const savedObjectsClient = Private(SavedObjectsClientProvider);

    return savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title', 'type'],
      perPage: 10000
    }).then(response => response.savedObjects);
  }
};

// add a dependency to all of the subsection routes
uiRoutes
  .defaults(/management\/kibana\/indices/, {
    resolve: indexPatternsResolutions
  });

uiRoutes
  .defaults(/management\/kibana\/index/, {
    resolve: indexPatternsResolutions
  });

// wrapper directive, which sets some global stuff up like the left nav
uiModules.get('apps/management')
  .directive('kbnManagementIndices', function ($route, config, kbnUrl, Private) {
    return {
      restrict: 'E',
      transclude: true,
      template: indexTemplate,
      link: async function ($scope) {
        const indexPatternListProvider = Private(IndexPatternListFactory)();
        const indexPatternCreationProvider = Private(IndexPatternCreationFactory)();
        const indexPatternCreationOptions = await indexPatternCreationProvider.getIndexPatternCreationOptions((url) => {
          $scope.$evalAsync(() => kbnUrl.change(url));
        });

        const renderList = () => {
          $scope.indexPatternList = $route.current.locals.indexPatterns.map(pattern => {
            const id = pattern.id;
            const tags = indexPatternListProvider.getIndexPatternTags(pattern, $scope.defaultIndex === id);

            return {
              id: id,
              title: pattern.get('title'),
              url: kbnUrl.eval('#/management/kibana/indices/{{id}}', { id: id }),
              active: $scope.editingId === id,
              default: $scope.defaultIndex === id,
              tag: tags && tags.length ? tags[0] : null,
            };
          }).sort((a, b) => {
            if(a.default) {
              return -1;
            }
            if(b.default) {
              return 1;
            }
            if(a.title < b.title) {
              return -1;
            }
            if(a.title > b.title) {
              return 1;
            }
            return 0;
          }) || [];

          updateIndexPatternList($scope, indexPatternCreationOptions, $scope.defaultIndex, $scope.indexPatternList);
        };

        $scope.$on('$destroy', destroyIndexPatternList);
        $scope.editingId = $route.current.params.indexPatternId;
        $scope.$watch('defaultIndex', () => renderList());
        config.bindToScope($scope, 'defaultIndex');
        $scope.$apply();
      }
    };
  });

management.getSection('kibana').register('indices', {
  display: i18n.translate('kbn.management.indexPattern.sectionsHeader', { defaultMessage: 'Index Patterns' }),
  order: 0,
  url: '#/management/kibana/indices/'
});

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'index_patterns',
    title: i18n.translate('kbn.management.indexPatternHeader', { defaultMessage: 'Index Patterns' }),
    description: i18n.translate('kbn.management.indexPatternLabel',
      { defaultMessage: 'Manage the index patterns that help retrieve your data from Elasticsearch.' }),
    icon: 'indexPatternApp',
    path: '/app/kibana#/management/kibana/indices',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
