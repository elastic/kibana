export function decorateFormController($delegate, $injector) {
  const [directive] = $delegate;
  const FormController = directive.controller;

  class KbnFormController extends FormController {
    // prevent inheriting FormController's static $inject property
    // which is angular's cache of the DI arguments for a function
    static $inject = ['$scope', '$element'];

    constructor($scope, $element, ...superArgs) {
      super(...superArgs);

      $element.on('submit', this._onSubmit);
      $scope.$on('$destroy', () => {
        $element.off('submit', this._onSubmit);
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

    _onSubmit = () => {
      if (this.errorCount()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.$setTouched();
      }
    }

    _getInvalidModels() {
      return (function collect(modelGroup) {
        return Object.values(modelGroup.$error).reduce((acc, models) => {
          return [
            ...acc,
            ...(models || []).reduce((acc, model) => {
              if (model.$$invalidModels) {
                // this is another model group that has its own child models,
                // like a nested ng-form, so recurse and keep going
                return [
                  ...acc,
                  ...collect(model)
                ];
              }

              return [...acc, model];
            }, [])
          ];
        }, []);
      }(this));
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
