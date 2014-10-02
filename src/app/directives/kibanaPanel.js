define([
  'angular',
  'jquery'
],
function (angular,$) {
  'use strict';

  angular
    .module('kibana.directives')
    .directive('kibanaPanel', function($compile, $rootScope) {
      var container = '<div class="panel-container"></div>';
      var content = '<div class="panel-content" ng-style="{\'min-height\':row.height}"></div>';

      var panelHeader =
      '<div class="panel-header">'+
        '<div class="row-fluid">' +
          '<div class="span12 alert-error panel-error" ng-hide="!panel.error">' +
            '<a class="close" ng-click="panel.error=false">&times;</a>' +
            '<i class="icon-exclamation-sign"></i> <strong>Oops!</strong> {{panel.error}}' +
          '</div>' +
        '</div>\n' +

        '<div class="row-fluid panel-extra">' +
          '<div class="panel-extra-container">' +

            '<span class="extra row-button" ng-show="panel.editable != false && panel.removable != false">' +
              '<span confirm-click="row.panels = _.without(row.panels,panel)" '+
              'confirmation="Are you sure you want to remove this {{panel.type}} panel?" class="pointer">'+
              '<i class="icon-remove pointer" bs-tooltip="\'Remove\'"></i></span>'+
            '</span>' +

            '<span class="extra row-button" ng-hide="panel.draggable == false">' +
              '<span class="pointer" bs-tooltip="\'Drag here to move\'"' +
              'data-drag=true data-jqyoui-options="kbnJqUiDraggableOptions"'+
              ' jqyoui-draggable="'+
              '{'+
                'animate:false,'+
                'mutate:false,'+
                'index:{{$index}},'+
                'onStart:\'panelMoveStart\','+
                'onStop:\'panelMoveStop\''+
                '}"  ng-model="row.panels"><i class="icon-move"></i></span>'+
            '</span>' +

            '<span class="row-button extra" ng-show="panel.editable != false">' +
              '<span config-modal="./app/partials/paneleditor.html" kbn-model="panel" class="pointer">'+
              '<i class="icon-cog pointer" bs-tooltip="\'Configure\'"></i></span>'+
            '</span>' +

            '<span ng-repeat="task in panelMeta.modals" class="row-button extra" ng-show="task.show">' +
              '<span bs-modal="task.partial" class="pointer"><i ' +
                'bs-tooltip="task.description" ng-class="task.icon" class="pointer"></i></span>'+
            '</span>' +

            '<span class="row-button extra" ng-show="panelMeta.loading == true">' +
              '<span>'+
                '<i class="icon-spinner icon-spin icon-large"></i>' +
              '</span>'+
            '</span>' +

            '<span class="panel-text panel-title">' +
              '{{panel.title?panel.title:panel.type}}' +
            '</span>'+

          '</div>'+
        '</div>\n'+
      '</div>';
      return {
        restrict: 'A',
        replace: true,
        link: function($scope, elem, attr) {
          // once we have the template, scan it for controllers and
          // load the module.js if we have any
          var newScope = $scope.$new();

          elem.parent().parent().parent().resize(function() {
            $rootScope.$broadcast('render');
          });

          $scope.kbnJqUiDraggableOptions = {
            revert: 'invalid',
            helper: function() {
              return $('<div style="width:200px;height:100px;background: rgba(100,100,100,0.50);"/>');
            },
            placeholder: 'keep'
          };

          // compile the module and uncloack. We're done
          function loadModule($module) {
            $module.appendTo(elem);
            elem.wrapInner(container);
            /* jshint indent:false */
            $compile(elem.contents())(newScope);
            elem.removeClass("ng-cloak");
          }

          newScope.$on('$destroy',function(){
            elem.unbind();
            elem.remove();
          });

          $scope.$watch(attr.type, function (name) {
            elem.addClass("ng-cloak");
            // load the panels module file, then render it in the dom.
            var nameAsPath = name.replace(".", "/");
            $scope.require([
              'jquery',
              'text!panels/'+nameAsPath+'/module.html',
              'text!panels/'+nameAsPath+'/editor.html'
            ], function ($, moduleTemplate) {
              var $module = $(moduleTemplate);
              // top level controllers
              var $controllers = $module.filter('ngcontroller, [ng-controller], .ng-controller');
              // add child controllers
              $controllers = $controllers.add($module.find('ngcontroller, [ng-controller], .ng-controller'));

              if ($controllers.length) {
                $controllers.first().prepend(panelHeader);

                $controllers.first().find('.panel-header').nextAll().wrapAll(content);

                $scope.require([
                  'panels/'+nameAsPath+'/module'
                ], function() {
                  loadModule($module);
                });
              } else {
                loadModule($module);
              }
            });
          });
        }
      };
    });

});
