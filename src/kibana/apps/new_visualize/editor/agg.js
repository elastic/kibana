define(function (require) {
  require('modules')
  .get('app/visualize')
  .directive('visEditorAgg', function ($compile, $parse, Private, Notifier) {
    var _ = require('lodash');
    var $ = require('jquery');
    var aggTypes = Private(require('components/agg_types/index'));

    var notify = new Notifier({
      location: 'visAggGroup'
    });

    return {
      restrict: 'E',
      replace: true,
      template: require('text!apps/visualize/editor/agg.html'),
      scope: {
        vis: '=',
        agg: '=',
        $index: '=',
        group: '=',
        groupName: '=',
        groupMin: '=',
        savedVis: '='
      },
      link: function ($scope, $el) {
        $scope.aggTypeOptions = aggTypes.byType[$scope.groupName];
        $scope.editorOpen = $scope.agg.brandNew;

        $scope.$watch('$index', function (i) {
          $scope.$first = i === 0;
          $scope.$last = i === $scope.group.length - 1;
        });

        (function setupControlManagement() {
          var $editorContainer = $el.find('.vis-editor-agg-editor');

          if ($scope.agg.schema.editor) {
            var $schemaEditor = $('<div>').prependTo($editorContainer);
            $schemaEditor.append($scope.agg.schema.editor);
            $compile($schemaEditor)(editorScope());
          }

          // rebuild these each time the agg.type changes
          var $aggParamsScope;
          var $aggParamsContainer;

          $scope.$watch('agg.type', function updateAggParamEditor(type) {
            if ($aggParamsScope) $aggParamsScope.$destroy();
            if ($aggParamsContainer) $aggParamsContainer.remove();

            if (!type) return;

            $aggParamsContainer = $('<div>').appendTo($editorContainer);
            $aggParamsScope = editorScope();

            $compile($aggParamsContainer)($aggParamsScope);

            $aggParamsContainer.html(type.params.map(function (param, i) {
              if (!param.editor) return '';

              var $child = $aggParamsScope.$new();
              setupBoundProp($child, 'agg.type.params[' + i + ']', 'aggParam');

              return $compile(param.editor)($child);
            }));

            $scope.agg.fillDefaults();
          });

          // generic child scope creation, for both schema and agg
          function editorScope() {
            var $editorScope = $scope.$new();

            setupBoundProp($editorScope, 'agg.type', 'aggType');
            setupBoundProp($editorScope, 'agg', 'aggConfig');
            setupBoundProp($editorScope, 'agg.params', 'params');

            return $editorScope;
          }

          // bind a property from our scope a child scope, with one-way binding
          function setupBoundProp($child, get, set) {
            var getter = _.partial($parse(get), $scope);
            var setter = _.partial($parse(set).assign, $child);
            $scope.$watch(getter, setter);
          }
        }());

        /**
         * [makeDescription description]
         * @return {[type]} [description]
         */
        $scope.makeDescription = function () {
          if (!$scope.agg.type.makeLabel) return '';

          var label = $scope.agg.type.makeLabel($scope.agg);
          return label ? label : '';
        };

        $scope.moveUp = function (agg) {
          var aggs = $scope.vis.aggs;

          var i = aggs.indexOf(agg);
          if (i <= 0) return notify.log('already first');
          aggs.splice(i, 1);

          // find the most previous bucket agg
          var d = i - 1;
          for (; d > 0 && aggs[d].schema.group !== 'buckets'; d--) ;

          // place this right before
          aggs.splice(d, 0, agg);
        };

        $scope.moveDown = function (agg) {
          var aggs = $scope.vis.aggs;

          var i = aggs.indexOf(agg);
          if (i >= aggs.length - 1) return notify.log('already last');
          aggs.splice(i, 1);

          // find the next bucket agg
          var d = i;
          for (; d < aggs.length && aggs[d].schema.group !== 'buckets'; d++) ;

          // place this agg right after
          aggs.splice(d + 1, 0, agg);
        };

        $scope.remove = function (agg) {
          var aggs = $scope.vis.aggs;

          var index = aggs.indexOf(agg);
          if (index === -1) return notify.log('already removed');

          aggs.splice(index, 1);
        };
      }
    };
  });
});