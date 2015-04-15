define(function (require) {
  var IndexedArray = require('utils/indexed_array/index');

  require('modules')
  .get('app/visualize')
  .directive('visEditorAggParams', function ($compile, $parse, Private, Notifier, $filter) {
    var _ = require('lodash');
    var $ = require('jquery');
    var aggTypes = Private(require('components/agg_types/index'));
    var aggSelectHtml = require('text!plugins/visualize/editor/agg_select.html');
    var advancedToggleHtml = require('text!plugins/visualize/editor/advanced_toggle.html');
    require('filters/match_any');
    require('plugins/visualize/editor/agg_param');

    var notify = new Notifier({
      location: 'visAggGroup'
    });

    return {
      restrict: 'E',
      template: require('text!plugins/visualize/editor/agg_params.html'),
      scope: true,
      link: function ($scope, $el, attr) {
        $scope.$bind('agg', attr.agg);
        $scope.$bind('groupName', attr.groupName);

        $scope.aggTypeOptions = aggTypes.byType[$scope.groupName];
        $scope.advancedToggled = false;

        // this will contain the controls for the schema (rows or columns?), which are unrelated to
        // controls for the agg, which is why they are first
        var $schemaEditor = $('<div>').addClass('schemaEditors').appendTo($el);

        if ($scope.agg.schema.editor) {
          $schemaEditor.append($scope.agg.schema.editor);
          $compile($schemaEditor)($scope.$new());
        }

        // allow selection of an aggregation
        var $aggSelect = $(aggSelectHtml).appendTo($el);
        $compile($aggSelect)($scope);

        // params for the selected agg, these are rebuilt every time the agg in $aggSelect changes
        var $aggParamEditors; //  container for agg type param editors
        var $aggParamEditorsScope;
        $scope.$watch('agg.type', function updateAggParamEditor(newType, oldType) {
          if ($aggParamEditors) {
            $aggParamEditors.remove();
            $aggParamEditors = null;
          }

          // if there's an old scope, destroy it
          if ($aggParamEditorsScope) {
            $aggParamEditorsScope.$destroy();
            $aggParamEditorsScope = null;
          }

          // create child scope, used in the editors
          $aggParamEditorsScope = $scope.$new();

          var agg = $scope.agg;
          if (!agg) return;

          var type = $scope.agg.type;

          if (newType !== oldType) {
            // don't reset on initial load, the
            // saved params should persist
            agg.resetParams();
          }

          if (!type) return;

          var aggParamHTML = {
            basic: [],
            advanced: []
          };

          // build collection of agg params html
          type.params.forEach(function (param, i) {
            var aggParam;
            var type = 'basic';
            if (param.advanced) type = 'advanced';

            if (aggParam = getAggParamHTML(param, i)) {
              aggParamHTML[type].push(aggParam);
            }

            // if field param exists, compute allowed fields
            if (param.name === 'field') {
              $aggParamEditorsScope.indexedFields = getIndexedFields(param);
            }
          });

          // compile the paramEditors html elements
          var paramEditors = aggParamHTML.basic;

          if (aggParamHTML.advanced.length) {
            paramEditors.push($(advancedToggleHtml).get(0));
            paramEditors = paramEditors.concat(aggParamHTML.advanced);
          }

          $aggParamEditors = $(paramEditors).appendTo($el);
          $compile($aggParamEditors)($aggParamEditorsScope);
        });

        // build HTML editor given an aggParam and index
        function getAggParamHTML(param, idx) {
          // don't show params without an editor
          if (!param.editor) {
            return;
          }

          var attrs = {
            'agg-param': 'agg.type.params[' + idx + ']'
          };

          if (param.advanced) {
            attrs['ng-show'] = 'advancedToggled';
          }

          return $('<vis-agg-param-editor>')
          .attr(attrs)
          .append(param.editor)
          .get(0);
        }

        function getIndexedFields(param) {
          var fields = $scope.agg.vis.indexPattern.fields.raw;
          var fieldTypes = param.filterFieldTypes;

          if (fieldTypes) {
            fields = $filter('fieldType')(fields, fieldTypes);
            fields = $filter('filter')(fields, { bucketable: true });
            fields = $filter('orderBy')(fields, ['type', 'name']);
          }

          return new IndexedArray({

            /**
             * @type {Array}
             */
            index: ['name'],

            /**
             * [group description]
             * @type {Array}
             */
            initialSet: fields
          });
        }

        // bind a property from our scope a child scope, with one-way binding
        function setupBoundProp($child, get, set) {
          var getter = _.partial($parse(get), $scope);
          var setter = _.partial($parse(set).assign, $child);
          $scope.$watch(getter, setter);
        }
      }
    };
  });
});
