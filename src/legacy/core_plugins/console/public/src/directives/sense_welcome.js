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

require('./sense_help_example');

import { i18n } from '@kbn/i18n';
import template from './welcome.html';

const storage = require('../storage');

require('ui/modules')
  .get('app/sense')
  .directive('senseWelcome', function () {
    return {
      restrict: 'E',
      template,
      link: function ($scope) {
        $scope.$on('$destroy', function () {
          storage.set('version_welcome_shown', '@@SENSE_REVISION');
        });
        $scope.asWellAsFragmentText = i18n.translate('console.welcomePage.supportedRequestFormatDescription.asWellAsFragmentText', {
          defaultMessage: 'as well as'
        });
      },
    };
  });
