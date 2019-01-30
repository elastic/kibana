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

import 'angular-ui-select';
import { uiModules } from '../../modules';
import template from './filter_params_phrases_editor.html';
import { filterParamsPhraseController } from './filter_params_phrase_controller';
import '../../directives/ui_select_focus_on';
import '../../filters/sort_prefix_first';

const module = uiModules.get('kibana');
module.directive('filterParamsPhrasesEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      params: '='
    },
    controllerAs: 'filterParamsPhrasesEditor',
    controller: filterParamsPhraseController
  };
});
