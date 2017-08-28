export function decorateModelController($delegate, $injector) {
  const [directive] = $delegate;
  const ModelController = directive.controller;

  class KbnModelController extends ModelController {
    // prevent inheriting ModelController's static $inject property
    // which is angular's cache of the DI arguments for a function
    static $inject = ['$scope', '$element'];

    constructor($scope, $element, ...superArgs) {
      super(...superArgs);

      const onInvalid = () => {
        this.$setTouched();
      };

      // the browser emits an "invalid" event when browser supplied
      // validation fails, which implies that the user has indirectly
      // interacted with the control and it should be treated as "touched"
      $element.on('invalid', onInvalid);
      $scope.$on('$destroy', () => {
        $element.off('invalid', onInvalid);
      });
    }
  }

  // replace controller with our wrapper
  directive.controller = [
    ...$injector.annotate(KbnModelController),
    ...$injector.annotate(ModelController),
    (...args) => (
      new KbnModelController(...args)
    )
  ];

  return $delegate;
}
