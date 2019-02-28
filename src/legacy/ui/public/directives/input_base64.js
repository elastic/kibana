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

import { uiModules } from '../modules';
const module = uiModules.get('kibana');
import * as Rx from 'rxjs';
import { map, switchMap, share } from 'rxjs/operators';

const multipleUsageErrorMessage = 'Cannot use input-base-sixty-four directive on input with `multiple` attribute';

const createFileContent$ = (file) => {
  return Rx.Observable.create(observer => {
    const reader = new FileReader();
    reader.onerror = (err) => {
      observer.error(err);
    };

    reader.onload = () => {
      observer.next(reader.result);
      observer.complete();
    };

    reader.readAsDataURL(file);

    return () => {
      reader.abort();
    };
  });
};

module.directive('inputBaseSixtyFour', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: 'isolate',
    link: function ($scope, $elem, attrs, ngModel) {
      if ($elem.prop('multiple')) {
        throw new Error(multipleUsageErrorMessage);
      }

      const maxSizeValidator = (dataUrl) => {
        return {
          errorKey: 'maxSize',
          isValid: attrs.max === '' || dataUrl.length <= parseInt(attrs.max)
        };
      };

      const validators = [ maxSizeValidator ];

      // produce fileContent$ whenever the $element 'change' event is triggered.
      const fileContent$ = Rx.fromEvent($elem, 'change', e => e).pipe(
        map(e => e.target.files),
        switchMap(files => {
          if (files.length === 0) {
            return [];
          }

          if (files.length > 1) {
            throw new Error(multipleUsageErrorMessage);
          }

          return createFileContent$(files[0]);
        }),
        share()
      );

      // validate the content of the files after it is loaded
      const validations$ = fileContent$.pipe(
        map(fileContent => (
          validators.map(validator => validator(fileContent))
        ))
      );

      // push results from input/validation to the ngModel
      const unsubscribe = Rx
        .combineLatest(fileContent$, validations$)
        .subscribe(([ fileContent, validations ]) => {
          $scope.$evalAsync(() => {
            validations.forEach(validation => {
              ngModel.$setValidity(validation.errorKey, validation.isValid);
            });

            if (validations.every(validation => validation.isValid)) {
              ngModel.$setViewValue(fileContent);
            }
          });
        }, (err) => {
          throw err;
        });

      $scope.$on('destroy', unsubscribe);
    }
  };
});
