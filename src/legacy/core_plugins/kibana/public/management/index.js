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

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { FormattedMessage } from '@kbn/i18n/react';

import './sections';
import 'ui/filters/start_from';
import 'ui/field_editor';
import uiRoutes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
import { uiModules } from 'ui/modules';
import appTemplate from './app.html';
import landingTemplate from './landing.html';
import { management, SidebarNav, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { timefilter } from 'ui/timefilter';
import { EuiPageContent, EuiTitle, EuiText, EuiSpacer, EuiIcon, EuiHorizontalRule } from '@elastic/eui';
import 'ui/kbn_top_nav';

const SIDENAV_ID = 'management-sidenav';
const LANDING_ID = 'management-landing';

uiRoutes
  .when('/management', {
    template: landingTemplate,
    k7Breadcrumbs: () => [
      MANAGEMENT_BREADCRUMB
    ]
  });

uiRoutes
  .when('/management/:section', {
    redirectTo: '/management'
  });

require('ui/index_patterns/route_setup/load_default')({
  whenMissingRedirectTo: '/management/kibana/index'
});

export function updateLandingPage(version) {
  const node = document.getElementById(LANDING_ID);
  if (!node) {
    return;
  }

  render(
    <EuiPageContent horizontalPosition="center">
      <I18nContext>
        <div>
          <div className="eui-textCenter">
            <EuiIcon type="managementApp" size="xxl" />
            <EuiSpacer />
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="kbn.management.landing.header"
                  defaultMessage="Kibana {version} management"
                  values={{ version }}
                />
              </h1>
            </EuiTitle>
            <EuiText>
              <FormattedMessage
                id="kbn.management.landing.subhead"
                defaultMessage="Manage your indices, index patterns, saved objects, Kibana settings, and more."
              />
            </EuiText>
          </div>

          <EuiHorizontalRule />

          <EuiText color="subdued" size="s" textAlign="center">
            <p>
              <FormattedMessage
                id="kbn.management.landing.text"
                defaultMessage="A full list of tools can be found in the left menu"
              />
            </p>
          </EuiText>
        </div>
      </I18nContext>
    </EuiPageContent>,
    node,
  );
}

export function updateSidebar(
  items, id
) {
  const node = document.getElementById(SIDENAV_ID);
  if (!node) {
    return;
  }

  render(
    <I18nContext>
      <SidebarNav
        sections={items}
        selectedId={id}
        className="mgtSideNav"
      />
    </I18nContext>,
    node,
  );
}

export const destroyReact = id => {
  const node = document.getElementById(id);
  node && unmountComponentAtNode(node);
};

uiModules
  .get('apps/management')
  .directive('kbnManagementApp', function (Private, $location) {
    return {
      restrict: 'E',
      template: appTemplate,
      transclude: true,
      scope: {
        sectionName: '@section',
        omitPages: '@omitBreadcrumbPages',
        pageTitle: '='
      },

      link: function ($scope) {
        timefilter.disableAutoRefreshSelector();
        timefilter.disableTimeRangeSelector();
        $scope.sections = management.items.inOrder;
        $scope.section = management.getSection($scope.sectionName) || management;

        if ($scope.section) {
          $scope.section.items.forEach(item => {
            item.active = `#${$location.path()}`.indexOf(item.url) > -1;
          });
        }

        updateSidebar($scope.sections, $scope.section.id);
        $scope.$on('$destroy', () => destroyReact(SIDENAV_ID));
        management.addListener(() => updateSidebar(management.items.inOrder, $scope.section.id));

        updateLandingPage($scope.$root.chrome.getKibanaVersion());
        $scope.$on('$destroy', () => destroyReact(LANDING_ID));
      }
    };
  });

uiModules
  .get('apps/management')
  .directive('kbnManagementLanding', function (kbnVersion) {
    return {
      restrict: 'E',
      link: function ($scope) {
        $scope.sections = management.items.inOrder;
        $scope.kbnVersion = kbnVersion;
      }
    };
  });

FeatureCatalogueRegistryProvider.register(i18n => {
  return {
    id: 'management',
    title: i18n('kbn.management.managementLabel', {
      defaultMessage: 'Management',
    }),
    description: i18n('kbn.management.managementDescription', {
      defaultMessage: 'Your center console for managing the Elastic Stack.',
    }),
    icon: 'managementApp',
    path: '/app/kibana#/management',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN
  };
});
