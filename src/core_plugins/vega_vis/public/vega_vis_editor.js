import $ from 'jquery';
import hjson from 'hjson';
import compactStringify from 'json-stringify-pretty-compact';
import split from 'split.js';

import vegaVisEditorTemplate from './vega_vis_editor.template.html';

export function VegaEditorProvider($rootScope, $compile, $timeout, getAppState) {
  return class VegaEditor {

    constructor(el, vis) {
      this.el = $(el);
      this.vis = vis;
    }

    render(visData/*, searchSource*/) {
      let $scope;

      const updateScope = () => {
        $scope.vis = this.vis;
        $scope.visData = visData;
        $scope.uiState = this.vis.getUiState();
        $scope.$apply();
      };

      return new Promise(resolve => {
        if (!this.$scope) {
          this.$scope = $scope = $rootScope.$new();

          updateScope();

          $scope.$watchMulti(
            ['=vis.params'],
            () => {
              const appState = getAppState();
              appState.vis.params = $scope.vis.params;
              appState.save(true);
            }
          );

          $scope.getCodeWidth = () => {
            // TODO: make this dynamic, based on the width of the code window
            return 65;
          };

          $scope.formatJson = () => {
            $scope._format(compactStringify, {
              maxLength: $scope.getCodeWidth()
            });
          };

          $scope.formatHJson = () => {
            $scope._format(hjson.stringify, {
              condense: $scope.getCodeWidth(),
              bracesSameLine: true
            });
          };

          $scope._format = (stringify, opts) => {
            // TODO: error handling and reporting
            try {
              const spec = hjson.parse($scope.vis.params.spec);
              $scope.vis.params.spec = stringify(spec, opts);
            } catch (err) {
              // FIXME!
              alert(err);
            }
          };

          this.el.html($compile(vegaVisEditorTemplate)($scope));


          $timeout(() => {
            split([this.el.find('.vegaEditor').get(0), this.el.find('.vegaEditorPreview').get(0)], {
              sizes: [40, 60],
              minSize: [200, 200],
              elementStyle: (dim, size, gutterSize) => ({ 'flex-basis': 'calc(' + size + '% - ' + gutterSize + 'px)' }),
              gutterStyle: (dim, gutterSize) => ({ 'flex-basis': gutterSize + 'px' })
            });
          });
        } else {
          $scope = this.$scope;
          updateScope();
        }

        $scope.renderComplete = resolve;
        $scope.$broadcast('render');
      });
    }

    resize() {}

    destroy() {
      if (this.$scope) {
        this.$scope.$destroy();
        this.$scope = null;
      }
    }
  };
}
