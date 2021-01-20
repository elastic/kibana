/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import angular from 'angular';
import 'ngreact';

export function createTopNavDirective() {
  return {
    restrict: 'E',
    template: '',
    compile: (elem) => {
      const child = document.createElement('kbn-top-nav-helper');

      // Copy attributes to the child directive
      for (const attr of elem[0].attributes) {
        child.setAttribute(attr.name, attr.value);
      }

      // Add a special attribute that will change every time that one
      // of the config array's disableButton function return value changes.
      child.setAttribute('disabled-buttons', 'disabledButtons');

      // Append helper directive
      elem.append(child);

      const linkFn = ($scope, _, $attr) => {
        // Watch config changes
        $scope.$watch(
          () => {
            const config = $scope.$eval($attr.config) || [];
            return config.map((item) => {
              // Copy key into id, as it's a reserved react propery.
              // This is done for Angular directive backward compatibility.
              // In React only id is recognized.
              if (item.key && !item.id) {
                item.id = item.key;
              }

              // Watch the disableButton functions
              if (typeof item.disableButton === 'function') {
                return item.disableButton();
              }
              return item.disableButton;
            });
          },
          (newVal) => {
            $scope.disabledButtons = newVal;
          },
          true
        );
      };

      return linkFn;
    },
  };
}

export const createTopNavHelper = ({ TopNavMenu }) => (reactDirective) => {
  return reactDirective(TopNavMenu, [
    ['config', { watchDepth: 'value' }],
    ['setMenuMountPoint', { watchDepth: 'reference' }],
    ['disabledButtons', { watchDepth: 'reference' }],

    ['query', { watchDepth: 'reference' }],
    ['savedQuery', { watchDepth: 'reference' }],
    ['intl', { watchDepth: 'reference' }],

    ['onQuerySubmit', { watchDepth: 'reference' }],
    ['onFiltersUpdated', { watchDepth: 'reference' }],
    ['onRefreshChange', { watchDepth: 'reference' }],
    ['onClearSavedQuery', { watchDepth: 'reference' }],
    ['onSaved', { watchDepth: 'reference' }],
    ['onSavedQueryUpdated', { watchDepth: 'reference' }],
    ['onSavedQueryIdChange', { watchDepth: 'reference' }],

    ['indexPatterns', { watchDepth: 'collection' }],
    ['filters', { watchDepth: 'collection' }],

    // All modifiers default to true.
    // Set to false to hide subcomponents.
    'showSearchBar',
    'showQueryBar',
    'showQueryInput',
    'showSaveQuery',
    'showDatePicker',
    'showFilterBar',

    'appName',
    'screenTitle',
    'dateRangeFrom',
    'dateRangeTo',
    'savedQueryId',
    'isRefreshPaused',
    'refreshInterval',
    'disableAutoFocus',
    'showAutoRefreshOnly',

    // temporary flag to use the stateful components
    'useDefaultBehaviors',
  ]);
};

let isLoaded = false;

export function loadKbnTopNavDirectives(navUi) {
  if (!isLoaded) {
    isLoaded = true;
    angular
      .module('kibana')
      .directive('kbnTopNav', createTopNavDirective)
      .directive('kbnTopNavHelper', createTopNavHelper(navUi));
  }
}
