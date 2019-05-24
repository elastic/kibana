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

import { i18n } from '@kbn/i18n';

export function decorateFormController($delegate, $injector) {
  const [directive] = $delegate;
  const FormController = directive.controller;

  class KbnFormController extends FormController {
    // prevent inheriting FormController's static $inject property
    // which is angular's cache of the DI arguments for a function
    static $inject = ['$scope', '$element'];

    constructor($scope, $element, ...superArgs) {
      super(...superArgs);

      const onSubmit = (event) => {
        this._markInvalidTouched(event);
      };

      $element.on('submit', onSubmit);
      $scope.$on('$destroy', () => {
        $element.off('submit', onSubmit);
      });
    }

    errorCount() {
      return this._getInvalidModels().length;
    }

    // same as error count, but filters out untouched and pristine models
    softErrorCount() {
      return this._getInvalidModels()
        .filter(model => model.$touched || model.$dirty)
        .length;
    }

    describeErrors() {
      const count = this.softErrorCount();
      return i18n.translate('common.ui.fancyForm.errorDescription',
        {
          defaultMessage: '{count, plural, one {# Error} other {# Errors}}',
          values: { count }
        });
    }

    $setTouched() {
      this._getInvalidModels()
        .forEach(model => model.$setTouched());
    }

    _markInvalidTouched(event) {
      if (this.errorCount()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.$setTouched();
      }
    }

    _getInvalidModels() {
      return this.$$controls.reduce((acc, control) => {
        // recurse into sub-form
        if (typeof control._getInvalidModels === 'function') {
          return [...acc, ...control._getInvalidModels()];
        }

        if (control.$invalid) {
          return [...acc, control];
        }

        return acc;
      }, []);
    }
  }

  // replace controller with our wrapper
  directive.controller = [
    ...$injector.annotate(KbnFormController),
    ...$injector.annotate(FormController),
    (...args) => (
      new KbnFormController(...args)
    )
  ];

  return $delegate;
}

