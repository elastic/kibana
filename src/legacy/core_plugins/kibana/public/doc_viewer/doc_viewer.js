/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import $ from 'jquery';
import { uiModules } from 'ui/modules';
import { DocViewsRegistryProvider } from 'ui/registry/doc_views';

import 'ui/render_directive';

uiModules.get('apps/discover')
  .directive('docViewer', function (Private) {
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
        const $viewer = $('<div class="kbnDocViewer">');
        $el.append($viewer);
        const $tabs = $('<div class="euiTabs euiTabs--small" role="tablist">');
        const $content = $('<div class="kbnDocViewer__content" role="tabpanel">');
        $viewer.append($tabs);
        $viewer.append($content);
        docViews.inOrder.forEach(view => {
          const $tab = $(
            `<button
            ng-show="docViews['${view.name}'].shouldShow(hit)"
            class="euiTab"
            ng-class="{'euiTab euiTab-isSelected': mode === '${view.name}', 'euiTab': true}"
            role="tab"
            aria-selected="{{mode === '${view.name}'}}"
            ng-click="mode='${view.name}'"
          >
            <span
              class="euiTab__content"
            >
              ${view.title}
            </span>
          </button>`
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
