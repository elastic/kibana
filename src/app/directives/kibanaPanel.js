define([
  'angular'
],
function (angular) {
  'use strict';

  angular
    .module('kibana.directives')
    .directive('kibanaPanel', function($compile) {
      var editorTemplate =
        '<i class="icon-spinner small icon-spin icon-large panel-loading"' +
          'ng-show="panelMeta.loading == true && !panel.title"></i>' +
        '<span class="editlink panelextra pointer" style="right:15px;top:0px"' +
          'bs-modal="\'app/partials/paneleditor.html\'" ng-show="panel.editable != false">' +
        '<span class="small">{{panel.type}}</span> <i class="icon-cog pointer"></i></span>' +
        '<h4 ng-show="panel.title">' +
          '{{panel.title}}' +
          '<i class="icon-spinner smaller icon-spin icon-large"' +
            'ng-show="panelMeta.loading == true && panel.title"></i>' +
        '</h4>';
      return {
        restrict: 'E',
        link: function($scope, elem, attr) {
          $scope.$watch(attr.type, function (name) {
            elem.addClass("ng-cloak");
            // load the panels module file, then render it in the dom.
            require([
              'jquery',
              'text!panels/'+name+'/module.html',

              'panels/'+name+'/module'
            ], function ($, moduleTemplate) {
              var $module = $(moduleTemplate);

              $module
                // top level controllers
                .filter('ngcontroller, [ng-controller], .ng-controller')
                // child controllers
                .add($module.find('ngcontroller, [ng-controller], .ng-controller'))
                  .first().prepend(editorTemplate);

              $module.appendTo(elem);
              /* jshint indent:false */
              $compile(elem.contents())($scope);
              elem.removeClass("ng-cloak");
            });
          });
        }
      };
    });

});