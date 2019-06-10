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
const mappings = require('../mappings');

require('ui/modules')
  .get('app/sense')
  .directive('senseSettings', function () {
    return {
      restrict: 'E',
      template,
      controllerAs: 'settings',
      controller: function ($scope, $element) {
        const settings = require('../settings');

        this.vals = settings.getCurrentSettings();
        this.apply = () => {
          const prevSettings = settings.getAutocomplete();
          this.vals = settings.updateSettings(this.vals);
          // Find which, if any, autocomplete settings have changed
          const settingsDiff = Object.keys(prevSettings).filter(key => prevSettings[key] !== this.vals.autocomplete[key]);
          if (settingsDiff.length > 0) {
            const changedSettings = settingsDiff.reduce((changedSettingsAccum, setting) => {
              changedSettingsAccum[setting] = this.vals.autocomplete[setting];
              return changedSettingsAccum;
            }, {});
            // Update autocomplete info based on changes so new settings takes effect immediately.
            mappings.retrieveAutoCompleteInfo(changedSettings);
          }
          $scope.kbnTopNav.close();
        };

        const self = this;

        function onEnter(event) {
          if (event.which === 13) {
            self.apply();
          }
        }

        const boundElement = $element.bind('keydown', onEnter);
        $scope.$on('$destroy', () => boundElement.unbind('keydown', onEnter));
      },
    };
  });
