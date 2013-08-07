/*jshint globalstrict:true */
/*global angular:true */
'use strict';

// Base modules
var modules = [
  'kibana.services',
  'kibana.controllers', 
  'kibana.filters', 
  'kibana.directives', 
  'elasticjs.service',
  '$strap.directives',
  'kibana.panels',
  'ngSanitize',
];

var scripts = [];

var labjs = $LAB
  .script("/bower_components/jquery/jquery.js").wait()
  .script("/bower_components/modernizr/modernizr.js")
  .script("/bower_components/angular/angular.js").wait()
  .script("/bower_components/angular-strap/dist/angular-strap.js")
  .script("/bower_components/angular-sanitize/angular-sanitize.js")
  .script("/bower_components/elastic.js/dist/elastic.js")
  .script("/bower_components/elastic.js/dist/elastic-angular-client.js").wait()
  .script("/bower_components/moment/moment.js")
  .script("/bower_components/FileSaver/FileSaver.js")
  .script("/bower_components/bootstrap/docs/assets/js/bootstrap.js")
  .script('/bower_components/bootstrap-datepicker/js/bootstrap-datepicker.js')
  .script('/bower_components/bootstrap-timepicker/js/bootstrap-timepicker.js').wait()
  .script("js/shared.js")
  .script("js/services.js")
  .script("js/controllers.js")
  .script("js/filters.js")
  .script("js/directives.js")
  .script("js/panels.js").wait();

_.each(config.modules, function(v) {
  labjs = labjs.script('panels/'+v+'/module.js');
  modules.push('kibana.'+v);
});

/* Application level module which depends on filters, controllers, and services */
labjs.wait(function(){
  angular.module('kibana', modules).config(['$routeProvider', function($routeProvider) {
      $routeProvider
        .when('/dashboard', {
          templateUrl: 'partials/dashboard.html',
        })
        .when('/dashboard/:type/:id', {
          templateUrl: 'partials/dashboard.html',
        })
        .when('/dashboard/:type/:id/:params', {
          templateUrl: 'partials/dashboard.html'
        })
        .otherwise({
          redirectTo: 'dashboard'
        });
    }]);
  angular.element(document).ready(function() {
    $('body').attr('ng-controller', 'DashCtrl');
    angular.bootstrap(document, ['kibana']);
  });
});
