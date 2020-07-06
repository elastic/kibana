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

import _ from 'lodash';
import rison from 'rison-node';
import { uiModules } from 'ui/modules';
import 'ui/directives/input_focus';
import savedObjectFinderTemplate from './saved_object_finder.html';
import { savedSheetLoader } from '../services/saved_sheets';
import { keyMap } from 'ui/directives/key_map';
import {
  PaginateControlsDirectiveProvider,
  PaginateDirectiveProvider,
} from '../../../../../plugins/kibana_legacy/public';
import { PER_PAGE_SETTING } from '../../../../../plugins/saved_objects/common';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../../../../plugins/visualizations/public';

const module = uiModules.get('kibana');

module
  .directive('paginate', PaginateDirectiveProvider)
  .directive('paginateControls', PaginateControlsDirectiveProvider)
  .directive('savedObjectFinder', function ($location, kbnUrl, Private, config) {
    return {
      restrict: 'E',
      scope: {
        type: '@',
        // optional make-url attr, sets the userMakeUrl in our scope
        userMakeUrl: '=?makeUrl',
        // optional on-choose attr, sets the userOnChoose in our scope
        userOnChoose: '=?onChoose',
        // optional useLocalManagement attr,  removes link to management section
        useLocalManagement: '=?useLocalManagement',
        /**
         * @type {function} - an optional function. If supplied an `Add new X` button is shown
         * and this function is called when clicked.
         */
        onAddNew: '=',
        /**
         * @{type} boolean - set this to true, if you don't want the search box above the
         * table to automatically gain focus once loaded
         */
        disableAutoFocus: '=',
      },
      template: savedObjectFinderTemplate,
      controllerAs: 'finder',
      controller: function ($scope, $element) {
        const self = this;

        // the text input element
        const $input = $element.find('input[ng-model=filter]');

        // The number of items to show in the list
        $scope.perPage = config.get(PER_PAGE_SETTING);

        // the list that will hold the suggestions
        const $list = $element.find('ul');

        // the current filter string, used to check that returned results are still useful
        let currentFilter = $scope.filter;

        // the most recently entered search/filter
        let prevSearch;

        // the list of hits, used to render display
        self.hits = [];

        self.service = savedSheetLoader;
        self.properties = self.service.loaderProperties;

        filterResults();

        /**
         * Boolean that keeps track of whether hits are sorted ascending (true)
         * or descending (false) by title
         * @type {Boolean}
         */
        self.isAscending = true;

        /**
         * Sorts saved object finder hits either ascending or descending
         * @param  {Array} hits Array of saved finder object hits
         * @return {Array} Array sorted either ascending or descending
         */
        self.sortHits = function (hits) {
          self.isAscending = !self.isAscending;
          self.hits = self.isAscending
            ? _.sortBy(hits, 'title')
            : _.sortBy(hits, 'title').reverse();
        };

        /**
         * Passed the hit objects and will determine if the
         * hit should have a url in the UI, returns it if so
         * @return {string|null} - the url or nothing
         */
        self.makeUrl = function (hit) {
          if ($scope.userMakeUrl) {
            return $scope.userMakeUrl(hit);
          }

          if (!$scope.userOnChoose) {
            return hit.url;
          }

          return '#';
        };

        self.preventClick = function ($event) {
          $event.preventDefault();
        };

        /**
         * Called when a hit object is clicked, can override the
         * url behavior if necessary.
         */
        self.onChoose = function (hit, $event) {
          if ($scope.userOnChoose) {
            $scope.userOnChoose(hit, $event);
          }

          const url = self.makeUrl(hit);
          if (!url || url === '#' || url.charAt(0) !== '#') return;

          $event.preventDefault();

          // we want the '/path', not '#/path'
          kbnUrl.change(url.substr(1));
        };

        $scope.$watch('filter', function (newFilter) {
          // ensure that the currentFilter changes from undefined to ''
          // which triggers
          currentFilter = newFilter || '';
          filterResults();
        });

        $scope.pageFirstItem = 0;
        $scope.pageLastItem = 0;
        $scope.onPageChanged = (page) => {
          $scope.pageFirstItem = page.firstItem;
          $scope.pageLastItem = page.lastItem;
        };

        //manages the state of the keyboard selector
        self.selector = {
          enabled: false,
          index: -1,
        };

        self.getLabel = function () {
          return _.words(self.properties.nouns).map(_.upperFirst).join(' ');
        };

        //key handler for the filter text box
        self.filterKeyDown = function ($event) {
          switch (keyMap[$event.keyCode]) {
            case 'enter':
              if (self.hitCount !== 1) return;

              const hit = self.hits[0];
              if (!hit) return;

              self.onChoose(hit, $event);
              $event.preventDefault();
              break;
          }
        };

        //key handler for the list items
        self.hitKeyDown = function ($event, page, paginate) {
          switch (keyMap[$event.keyCode]) {
            case 'tab':
              if (!self.selector.enabled) break;

              self.selector.index = -1;
              self.selector.enabled = false;

              //if the user types shift-tab return to the textbox
              //if the user types tab, set the focus to the currently selected hit.
              if ($event.shiftKey) {
                $input.focus();
              } else {
                $list.find('li.active a').focus();
              }

              $event.preventDefault();
              break;
            case 'down':
              if (!self.selector.enabled) break;

              if (self.selector.index + 1 < page.length) {
                self.selector.index += 1;
              }
              $event.preventDefault();
              break;
            case 'up':
              if (!self.selector.enabled) break;

              if (self.selector.index > 0) {
                self.selector.index -= 1;
              }
              $event.preventDefault();
              break;
            case 'right':
              if (!self.selector.enabled) break;

              if (page.number < page.count) {
                paginate.goToPage(page.number + 1);
                self.selector.index = 0;
                selectTopHit();
              }
              $event.preventDefault();
              break;
            case 'left':
              if (!self.selector.enabled) break;

              if (page.number > 1) {
                paginate.goToPage(page.number - 1);
                self.selector.index = 0;
                selectTopHit();
              }
              $event.preventDefault();
              break;
            case 'escape':
              if (!self.selector.enabled) break;

              $input.focus();
              $event.preventDefault();
              break;
            case 'enter':
              if (!self.selector.enabled) break;

              const hitIndex = (page.number - 1) * paginate.perPage + self.selector.index;
              const hit = self.hits[hitIndex];
              if (!hit) break;

              self.onChoose(hit, $event);
              $event.preventDefault();
              break;
            case 'shift':
              break;
            default:
              $input.focus();
              break;
          }
        };

        self.hitBlur = function () {
          self.selector.index = -1;
          self.selector.enabled = false;
        };

        self.manageObjects = function (type) {
          $location.url('/management/kibana/objects?_a=' + rison.encode({ tab: type }));
        };

        self.hitCountNoun = function () {
          return (self.hitCount === 1 ? self.properties.noun : self.properties.nouns).toLowerCase();
        };

        function selectTopHit() {
          setTimeout(function () {
            //triggering a focus event kicks off a new angular digest cycle.
            $list.find('a:first').focus();
          }, 0);
        }

        function filterResults() {
          if (!self.service) return;
          if (!self.properties) return;

          // track the filter that we use for this search,
          // but ensure that we don't search for the same
          // thing twice. This is called from multiple places
          // and needs to be smart about when it actually searches
          const filter = currentFilter;
          if (prevSearch === filter) return;

          prevSearch = filter;

          const isLabsEnabled = config.get(VISUALIZE_ENABLE_LABS_SETTING);
          self.service.find(filter).then(function (hits) {
            hits.hits = hits.hits.filter(
              (hit) => isLabsEnabled || _.get(hit, 'type.stage') !== 'experimental'
            );
            hits.total = hits.hits.length;

            // ensure that we don't display old results
            // as we can't really cancel requests
            if (currentFilter === filter) {
              self.hitCount = hits.total;
              self.hits = _.sortBy(hits.hits, 'title');
            }
          });
        }
      },
    };
  });
