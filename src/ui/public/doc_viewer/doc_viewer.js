import _ from 'lodash';
import $ from 'jquery';
import 'ui/doc_viewer/doc_viewer.less';

import 'ui/doc_viewer/viewers/table.js';
import 'ui/doc_viewer/viewers/json.js';

define(function (require) {

  require('ui/modules').get('kibana')
  .directive('docViewer', function (config, Private) {
    const docTableDetailViews = Private(require('ui/registry/doc_table_detail_views'));
    return {
      restrict: 'E',
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=?',
        columns: '=?'
      },
      template: function ($el, $attr) {
        const $viewer = $('<div class="doc-viewer">');
        $el.append($viewer);
        const $tabs = $('<ul class="nav nav-tabs">');
        const $content = $('<div class="doc-viewer-content">');
        $viewer.append($tabs);
        $viewer.append($content);
        docTableDetailViews.inOrder.forEach(view => {
          const $tab = $(`<li ng-show="docViews['${view.title}'].shouldShow(hit)" ng-class="{active: mode == '${view.title}'}">
              <a ng-click="mode='${view.title}'">${view.title}</a>
            </li>`);
          $tabs.append($tab);
          const $ext = $(`<render-directive ng-show="mode == '${view.title}'" definition="docViews['${view.title}']" scope="innerScope">
            </render-directive>`);
          $ext.html(view.template);
          $content.append($ext);
        });
        return $el.html();
      },
      controller: function ($scope) {
        $scope.mode = docTableDetailViews.inOrder[0].title;
        $scope.docViews = docTableDetailViews.byTitle;

        $scope.innerScope = {
          hit: $scope.hit,
          indexPattern: $scope.indexPattern,
          filter: $scope.filter,
          columns: $scope.columns
        };
      }
    };
  });
});
