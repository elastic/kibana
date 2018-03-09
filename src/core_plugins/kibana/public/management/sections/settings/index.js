import _ from 'lodash';
import { toEditableConfig } from './lib/to_editable_config';
import './advanced_row';
import { management } from 'ui/management';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from './index.html';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { AdvancedSettingsTable } from './advanced_settings_table';

const REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID = 'reactAdvancedSettingsTable';

function renderAdvancedSettingsTable($scope, config) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <AdvancedSettingsTable
        config={config}
      />,
      node,
    );
  });
}

function destroyAdvancedSettingsTable() {
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
        renderAdvancedSettingsTable($scope, config);

        $scope.$on('$destory', () => {
          destroyAdvancedSettingsTable();
        });

      // // react to changes of the config values
      //   config.watchAll(changed, $scope);
      //
      //   // initial config setup
      //   changed();
      //
      //   function changed() {
      //     const all = config.getAll();
      //     const editable = _(all)
      //       .map((def, name) => toEditableConfig({
      //         def,
      //         name,
      //         value: def.userValue,
      //         isCustom: config.isCustom(name)
      //       }))
      //       .value();
      //     const writable = _.reject(editable, 'readonly');
      //     $scope.configs = writable;
      //   }
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
