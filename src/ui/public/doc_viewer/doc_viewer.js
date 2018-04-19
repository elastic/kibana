import $ from 'jquery';
import { uiModules } from '../modules';
import { DocViewsRegistryProvider } from '../registry/doc_views';

import '../render_directive';
import './doc_viewer.less';

uiModules.get('kibana')
  .directive('docViewer', function (config, Private) {
    const docViews = Private(DocViewsRegistryProvider);
    return {
      restrict: 'E',
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=?',
        columns: '=?',
        onAddColumn: '=?',
        onRemoveColumn: '=?',
      },
      template: function ($el) {
        const $viewer = $('<div class="doc-viewer">');
        $el.append($viewer);
        const $tabs = $('<ul class="nav nav-tabs" role="tablist">');
        const $content = $('<div class="doc-viewer-content" role="tabpanel">');
        $viewer.append($tabs);
        $viewer.append($content);
        docViews.inOrder.forEach(view => {
          const $tab = $(
            `<li
            ng-show="docViews['${view.name}'].shouldShow(hit)"
            ng-class="{active: mode == '${view.name}'}"
            role="tab"
            aria-selected="{{mode === '${view.name}'}}"
          >
            <a
              ng-click="mode='${view.name}'"
              kbn-accessible-click
            >
              ${view.title}
            </a>
          </li>`
          );
          $tabs.append($tab);
          const $viewAttrs = `
          hit="hit"
          index-pattern="indexPattern"
          filter="filter"
          columns="columns"
          on-add-column="onAddColumn"
          on-remove-column="onRemoveColumn"
        `;
          const $ext = $(`<render-directive ${$viewAttrs} ng-if="mode == '${view.name}'" definition="docViews['${view.name}'].directive">
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
