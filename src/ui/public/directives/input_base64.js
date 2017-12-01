import { uiModules } from 'ui/modules';
import { Observable } from 'rxjs/Rx';
const module = uiModules.get('kibana');

const $readFileContents = (file) => {
  return Observable.create(observer => {
    const reader = new FileReader();
    reader.onerror = (err) => {
      observer.error(err);
      observer.complete();
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
      const maxSizeValidator = (dataUrl) => {
        const base64ToKb = (length) => {
          const totalBits = length * 6; // 6 bits per character in base64
          return totalBits / 8 / 1024;
        };

        return {
          errorKey: 'maxSize',
          isValid: base64ToKb(dataUrl.length) <= attrs.max
        };
      };

      const validators = [ maxSizeValidator ];

      const unsubscribe = Observable.fromEvent($elem, 'change')
        .map(e => e.target.files)
        .switchMap(files => {
          if (files.length === 0) {
            return [];
          }

          if (files.length > 1) {
            throw new Error('Only one file is supported at this time');
          }

          return $readFileContents(files[0]);
        })
        .map(dataUrl => {
          const validations = validators.map(validator => validator(dataUrl));

          return { dataUrl, validations };
        })
        .subscribe(({ dataUrl, validations }) => {
          $scope.$evalAsync(() => {
            validations.forEach(validation => {
              ngModel.$setValidity(validation.errorKey, validation.isValid);
            });

            if (validations.every(validation => validation.isValid)) {
              ngModel.$setViewValue(dataUrl);
            }
          });
        });

      $scope.$on('destroy', unsubscribe);
    }
  };
});