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
import { setup as managementSetup } from '../../../../../management/public/legacy';
import './create_index_pattern_wizard';
import './edit_index_pattern';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from './index.html';
import indexPatternListTemplate from './list.html';
import { IndexPatternTable } from './index_pattern_table';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import {
  FeatureCatalogueRegistryProvider,
  FeatureCatalogueCategory,
} from 'ui/registry/feature_catalogue';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import { UICapabilitiesProvider } from 'ui/capabilities/react';
import { getListBreadcrumbs } from './breadcrumbs';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

const INDEX_PATTERN_LIST_DOM_ELEMENT_ID = 'indexPatternListReact';

export function updateIndexPatternList(indexPatterns, kbnUrl, indexPatternCreationOptions) {
  const node = document.getElementById(INDEX_PATTERN_LIST_DOM_ELEMENT_ID);
  if (!node) {
    return;
  }

  render(
    <I18nContext>
      <UICapabilitiesProvider>
        <IndexPatternTable
          indexPatterns={indexPatterns}
          navTo={kbnUrl.redirect}
          indexPatternCreationOptions={indexPatternCreationOptions}
        />
      </UICapabilitiesProvider>
    </I18nContext>,
    node
  );
}

export const destroyIndexPatternList = () => {
  const node = document.getElementById(INDEX_PATTERN_LIST_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
};

const indexPatternsResolutions = {
  indexPatterns: function (Private) {
    const savedObjectsClient = Private(SavedObjectsClientProvider);

    return savedObjectsClient
      .find({
        type: 'index-pattern',
        fields: ['title', 'type'],
        perPage: 10000,
      })
      .then(response => response.savedObjects);
  },
};

// add a dependency to all of the subsection routes
uiRoutes.defaults(/management\/kibana\/(index_patterns|index_pattern)/, {
  resolve: indexPatternsResolutions,
  requireUICapability: 'management.kibana.index_patterns',
  badge: uiCapabilities => {
    if (uiCapabilities.indexPatterns.save) {
      return undefined;
    }

    return {
      text: i18n.translate('kbn.management.indexPatterns.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('kbn.management.indexPatterns.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save index patterns',
      }),
      iconType: 'glasses',
    };
  },
});

uiRoutes.when('/management/kibana/index_patterns', {
  template: indexPatternListTemplate,
  k7Breadcrumbs: getListBreadcrumbs,
});

// wrapper directive, which sets some global stuff up like the left nav
uiModules
  .get('apps/management')
  .directive('kbnManagementIndexPatterns', function ($route, config, kbnUrl) {
    return {
      restrict: 'E',
      transclude: true,
      template: indexTemplate,
      link: async function ($scope) {
        const indexPatternCreationOptions = await managementSetup.indexPattern.creation.getIndexPatternCreationOptions(
          url => {
            $scope.$evalAsync(() => kbnUrl.change(url));
          }
        );

        const renderList = () => {
          $scope.indexPatternList =
            $route.current.locals.indexPatterns
              .map(pattern => {
                const id = pattern.id;
                const title = pattern.get('title');
                const isDefault = $scope.defaultIndex === id;
                const tags = managementSetup.indexPattern.list.getIndexPatternTags(
                  pattern,
                  isDefault
                );

                return {
                  id,
                  title,
                  url: kbnUrl.eval('#/management/kibana/index_patterns/{{id}}', { id: id }),
                  active: $scope.editingId === id,
                  default: isDefault,
                  tags,
                  //the prepending of 0 at the default pattern takes care of prioritization
                  //so the sorting will but the default index on top
                  //or on bottom of a the table
                  sort: `${isDefault ? '0' : '1'}${title}`,
                };
              })
              .sort((a, b) => {
                if (a.sort < b.sort) {
                  return -1;
                } else if (a.sort > b.sort) {
                  return 1;
                } else {
                  return 0;
                }
              }) || [];

          updateIndexPatternList($scope.indexPatternList, kbnUrl, indexPatternCreationOptions);
        };

        $scope.$on('$destroy', destroyIndexPatternList);
        $scope.editingId = $route.current.params.indexPatternId;
        $scope.$watch('defaultIndex', () => renderList());
        config.bindToScope($scope, 'defaultIndex');
        $scope.$apply();
      },
    };
  });

management.getSection('kibana').register('index_patterns', {
  display: i18n.translate('kbn.management.indexPattern.sectionsHeader', {
    defaultMessage: 'Index Patterns',
  }),
  order: 0,
  url: '#/management/kibana/index_patterns/',
});

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'index_patterns',
    title: i18n.translate('kbn.management.indexPatternHeader', {
      defaultMessage: 'Index Patterns',
    }),
    description: i18n.translate('kbn.management.indexPatternLabel', {
      defaultMessage: 'Manage the index patterns that help retrieve your data from Elasticsearch.',
    }),
    icon: 'indexPatternApp',
    path: '/app/kibana#/management/kibana/index_patterns',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  };
});
