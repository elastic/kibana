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

require('ui/directives/input_focus');

import template from './settings.html';
import { getAutocomplete, getCurrentSettings, updateSettings, getPolling } from '../settings';
import mappings from '../mappings';

require('ui/modules')
  .get('app/sense')
  .directive('senseSettings', function () {
    return {
      restrict: 'E',
      template,
      controllerAs: 'settings',
      controller: function ($scope, $element) {
        this.vals = getCurrentSettings();

        this.isPollingVisible = () => {
          const selectedAutoCompleteOptions =
            Object.keys(this.vals.autocomplete).filter(key => this.vals.autocomplete[key]);
          return selectedAutoCompleteOptions.length > 0;
        };

        this.refresh = () => {
          mappings.retrieveAutoCompleteInfo();
        };

        this.saveSettings = () => {
          const prevSettings = getAutocomplete();
          const prevPolling = getPolling();

          this.vals = updateSettings(this.vals);

          // We'll only retrieve settings if polling is on.
          if (getPolling()) {
            // Find which, if any, autocomplete settings have changed.
            const settingsDiff = Object.keys(prevSettings).filter(key => prevSettings[key] !== this.vals.autocomplete[key]);
            const changedSettings = settingsDiff.reduce((changedSettingsAccum, setting) => {
              changedSettingsAccum[setting] = this.vals.autocomplete[setting];
              return changedSettingsAccum;
            }, {});

            const isSettingsChanged = settingsDiff.length > 0;
            const isPollingChanged = prevPolling !== getPolling();

            if (isSettingsChanged) {
              // If the user has changed one of the autocomplete settings, then we'll fetch just the
              // ones which have changed.
              mappings.retrieveAutoCompleteInfo(changedSettings);
            } else if (isPollingChanged) {
              // If the user has turned polling on, then we'll fetch all selected autocomplete settings.
              mappings.retrieveAutoCompleteInfo();
            }
          }

          $scope.kbnTopNav.close();
        };

        const self = this;

        function onEnter(event) {
          if (event.which === 13) {
            self.saveSettings();
          }
        }

        const boundElement = $element.bind('keydown', onEnter);
        $scope.$on('$destroy', () => boundElement.unbind('keydown', onEnter));
      },
    };
  });
