import _ from 'lodash';
import KbnFormController from 'ui/fancy_forms/kbn_form_controller';
import uiModules from 'ui/modules';


uiModules
.get('kibana')
.config(function ($provide) {
  function decorateDirectiveController(DecorativeController) {
    return function ($delegate, $injector) {
      // directive providers are arrays
      $delegate.forEach(function (directive) {
        // get metadata about all init fns
        const chain = [directive.controller, DecorativeController].map(function (fn) {
          const deps = $injector.annotate(fn);
          return { deps: deps, fn: _.isArray(fn) ? _.last(fn) : fn };
        });

        // replace the controller with one that will setup the actual controller
        directive.controller = function stub() {
          const allDeps = _.toArray(arguments);
          return chain.reduce(function (controller, link) {
            const deps = allDeps.splice(0, link.deps.length);
            return link.fn.apply(controller, deps) || controller;
          }, this);
        };

        // set the deps of our new controller to be the merged deps of every fn
        directive.controller.$inject = chain.reduce(function (deps, link) {
          return deps.concat(link.deps);
        }, []);
      });

      return $delegate;
    };
  }


  $provide.decorator('formDirective', decorateDirectiveController(KbnFormController));
  $provide.decorator('ngFormDirective', decorateDirectiveController(KbnFormController));
});
