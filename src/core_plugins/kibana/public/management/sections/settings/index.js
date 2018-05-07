import { management } from 'ui/management';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from './index.html';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { AdvancedSettings } from './advanced_settings';

const REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID = 'reactAdvancedSettings';

function updateAdvancedSettings($scope, config, query) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <AdvancedSettings
        config={config}
        query={query}
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
  .when('/management/kibana/settings/:setting?', {
    template: indexTemplate
  });

uiModules.get('apps/management')
  .directive('kbnManagementAdvanced', function (config, $route) {
    return {
      restrict: 'E',
      link: function ($scope) {
        config.watchAll(() => {
          updateAdvancedSettings($scope, config, $route.current.params.setting || '');
        }, $scope);

        $scope.$on('$destory', () => {
          destroyAdvancedSettings();
        });

        $route.updateParams({ setting: null });
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
    icon: 'advancedSettingsApp',
    path: '/app/kibana#/management/kibana/settings',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN
  };
});
