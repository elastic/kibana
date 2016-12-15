import _ from 'lodash';
import $ from 'jquery';
import uiModules from 'ui/modules';
import DocViewsProvider from 'ui/registry/doc_views';

import 'ui/render_directive';
import 'ui/doc_viewer/doc_viewer.less';

uiModules.get('kibana')
.directive('docViewer', function (config, Private) {
  const docViews = Private(DocViewsProvider);
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
      docViews.inOrder.forEach(view => {
        const $tab = $(`<li ng-show="docViews['${view.name}'].shouldShow(hit)" ng-class="{active: mode == '${view.name}'}">
            <a ng-click="mode='${view.name}'">${view.title}</a>
          </li>`);
        $tabs.append($tab);
        const $viewAttrs = 'hit="hit" index-pattern="indexPattern" filter="filter" columns="columns"';
        const $ext = $(`<render-directive ${$viewAttrs} ng-show="mode == '${view.name}'" definition="docViews['${view.name}'].directive">
          </render-directive>`);
        $ext.html(view.directive.template);
        $content.append($ext);
      });
      return $el.html();
    },
    controller: function ($scope) {
      $scope.mode = docViews.inOrder[0].name;
      $scope.docViews = docViews.byName;
    }
  };
});
