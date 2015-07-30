define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var KbnFormController = require('ui/fancy_forms/KbnFormController');
  var KbnModelController = require('ui/fancy_forms/KbnModelController');

  require('ui/modules')
  .get('kibana')
  .config(function ($provide) {
    function decorateDirectiveController(DecorativeController) {
      return function ($delegate, $injector) {
        // directive providers are arrays
        $delegate.forEach(function (directive) {
          // get metadata about all init fns
          var chain = [directive.controller, DecorativeController].map(function (fn) {
            var deps = $injector.annotate(fn);
            return { deps: deps, fn: _.isArray(fn) ? _.last(fn) : fn };
          });

          // replace the controller with one that will setup the actual controller
          directive.controller = function stub() {
            var allDeps = _.toArray(arguments);
            return chain.reduce(function (controller, link, i) {
              var deps = allDeps.splice(0, link.deps.length);
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
    $provide.decorator('ngModelDirective', decorateDirectiveController(KbnModelController));
  });
});
