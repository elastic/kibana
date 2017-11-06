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
      return `${count} Error${count === 1 ? '' : 's'}`;
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
