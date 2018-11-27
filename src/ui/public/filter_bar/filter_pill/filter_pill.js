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
import template from './filter_pill.html';
import { uiModules } from '../../modules';

const module = uiModules.get('kibana');

module.directive('filterPill', function (i18n) {
  return {
    template,
    restrict: 'E',
    scope: {
      filter: '=',
      onToggleFilter: '=',
      onPinFilter: '=',
      onInvertFilter: '=',
      onDeleteFilter: '=',
      onEditFilter: '=',
    },
    bindToController: true,
    controllerAs: 'pill',
    controller: function filterPillController($scope) {

      this.activateActions = () => {
        this.areActionsActivated = true;
      };

      this.deactivateActions = () => {
        this.areActionsActivated = false;
      };

      this.isControlledByPanel = () => {
        return _.has(this.filter, 'meta.controlledBy');
      };

      $scope.enableFilterAriaLabel = i18n('common.ui.filterBar.filterPill.enableFilterAriaLabel', { defaultMessage: 'Enable filter' });
      $scope.enableFilterTooltip = i18n('common.ui.filterBar.filterPill.enableFilterTooltip', { defaultMessage: 'Enable filter' });
      $scope.disableFilterAriaLabel = i18n('common.ui.filterBar.filterPill.disableFilterAriaLabel', { defaultMessage: 'Disable filter' });
      $scope.disableFilterTooltip = i18n('common.ui.filterBar.filterPill.disableFilterTooltip', { defaultMessage: 'Disable filter' });
      $scope.pinFilterAriaLabel = i18n('common.ui.filterBar.filterPill.pinFilterAriaLabel', { defaultMessage: 'Pin filter' });
      $scope.pinFilterTooltip = i18n('common.ui.filterBar.filterPill.pinFilterTooltip', { defaultMessage: 'Pin filter' });
      $scope.unpinFilterAriaLabel = i18n('common.ui.filterBar.filterPill.unpinFilterAriaLabel', { defaultMessage: 'Unpin filter' });
      $scope.unpinFilterTooltip = i18n('common.ui.filterBar.filterPill.unpinFilterTooltip', { defaultMessage: 'Unpin filter' });
      $scope.includeMatchesAriaLabel =
        i18n('common.ui.filterBar.filterPill.includeMatchesAriaLabel', { defaultMessage: 'Include matches' });
      $scope.includeMatchesTooltip = i18n('common.ui.filterBar.filterPill.includeMatchesTooltip', { defaultMessage: 'Include matches' });
      $scope.excludeMatchesAriaLabel =
        i18n('common.ui.filterBar.filterPill.excludeMatchesAriaLabel', { defaultMessage: 'Exclude matches' });
      $scope.excludeMatchesTooltip = i18n('common.ui.filterBar.filterPill.excludeMatchesTooltip', { defaultMessage: 'Exclude matches' });
    }
  };
});

