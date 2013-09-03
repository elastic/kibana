define([
  'angular',
  'app',
  'underscore'
],
function (angular, app, _) {
  'use strict';

  angular
    .module('kibana.directives')
    .directive('kibanaPanel', function($compile, $parse) {
      return {
        restrict: 'E',
        link: function(scope, elem, attr) {
          elem.addClass("ng-cloak");
          // the name of the panel's type
          scope._type = $parse(attr.type)(scope);
          // the directory relative to the require base dir
          scope._require_dir = 'panels/'+scope._type+'/';
          // the directory relative to the webroot
          scope._dir = 'app/'+scope._require_dir;

          /**
           * scope helpers
           */
          // helpers provided from app
          scope.app = app.panel_helpers;

          // return the url for a partial in the panels directory
          scope.partial = function (name) {
            return scope._dir + name + '.html';
          };

          // Require a file in the panel's dir
          scope.require = function (deps, cb) {
            if (_.isArray(deps)) {
              deps = _.map(deps, function (dep) {
                return scope._require_dir + dep;
              });
            } else {
              deps = scope._require_dir + deps;
            }
            require(deps, cb);
          };

          // load the panels module file, then render it in the dom.
          require([scope._require_dir +'module'], function () {
            elem.html(
              '<i class="icon-spinner small icon-spin icon-large panel-loading" '+
              'ng-show="panelMeta.loading == true && !panel.title"></i>'+
              ' <span class="editlink panelextra pointer" style="right:15px;top:0px" ' +
              'bs-modal="partial(\'editor\')" ng-show="panel.editable != false">'+
              '<span class="small">{{panel.type}}</span> <i class="icon-cog pointer"></i> '+
              '</span><h4 ng-show="panel.title">'+
              '{{panel.title}} '+
              '<i class="icon-spinner smaller icon-spin icon-large" ng-show="panelMeta.loading == true && panel.title"></i>'+
              '</h4>' +
              '<div ng-include="partial(\'module\')" ng-init="app.panelLoaded()"></div>'
            );
            $compile(elem.contents())(scope);
            elem.removeClass("ng-cloak");
          });
        }
      };
    });

});