import { management } from 'ui/management';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from './index.html';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { AdvancedSettings } from './advanced_settings';

const REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID = 'reactAdvancedSettings';

function updateAdvancedSettings($scope, config) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <AdvancedSettings
        config={config}
      />,
      node,
    );
  });
}

function destroyAdvancedSettings() {
  const node = document.getElementById(REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

uiRoutes
  .when('/management/kibana/settings', {
    template: indexTemplate
  });

uiModules.get('apps/management')
  .directive('kbnManagementAdvanced', function (config) {
    return {
      restrict: 'E',
      link: function ($scope) {
        config.watchAll(() => {
          updateAdvancedSettings($scope, config);
        }, $scope);

        $scope.$on('$destory', () => {
          destroyAdvancedSettings();
        });
      }
    };
  });

management.getSection('kibana').register('settings', {
  display: 'Advanced Settings',
  order: 20,
  url: '#/management/kibana/settings'
});

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'advanced_settings',
    title: 'Advanced Settings',
    description: 'Directly edit settings that control behavior in Kibana.',
    icon: '/plugins/kibana/assets/app_advanced_settings.svg',
    path: '/app/kibana#/management/kibana/settings',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN
  };
});
