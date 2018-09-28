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

import { IDirective, IRootElementService, IScope } from 'angular';

import { I18nServiceType } from './provider';

export function i18nDirective(i18n: I18nServiceType): IDirective {
  return {
    restrict: 'A',
    scope: {
      id: '@i18nId',
      defaultMessage: '@i18nDefaultMessage',
      values: '=i18nValues',
    },
    link($scope: IScope, $element: IRootElementService) {
      $scope.$watchGroup(
        ['id', 'defaultMessage', 'values'],
        ([id, defaultMessage = '', values = {}]) => {
          $element.html(
            i18n(id, {
              values,
              defaultMessage,
            })
          );
        }
      );
    },
  };
}
