import { uiModules } from '../modules';
import { Observable } from 'rxjs/Rx';
const module = uiModules.get('kibana');

const multipleUsageErrorMessage = 'Cannot use input-base-sixty-four directive on input with `multiple` attribute';

const createFileContent$ = (file) => {
  return Observable.create(observer => {
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
      const fileContent$ = Observable
        .fromEvent($elem, 'change')
        .map(e => e.target.files)
        .switchMap(files => {
          if (files.length === 0) {
            return [];
          }

          if (files.length > 1) {
            throw new Error(multipleUsageErrorMessage);
          }

          return createFileContent$(files[0]);
        })
        .share();

      // validate the content of the files after it is loaded
      const validations$ = fileContent$
        .map(fileContent => (
          validators.map(validator => validator(fileContent))
        ));

      // push results from input/validation to the ngModel
      const unsubscribe = Observable
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