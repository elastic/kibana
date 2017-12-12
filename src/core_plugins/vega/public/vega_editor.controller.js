import hjson from 'hjson';
import compactStringify from 'json-stringify-pretty-compact';
import split from 'split.js';

export function createVegaEditorController(getAppState) {

  class VegaEditorController {
    link($scope, $el /*, $attr*/) {

      split([$el.find('.vegaEditor').get(0), $el.find('.vegaEditorPreview').get(0)], {
        sizes: [40, 60],
        minSize: [200, 200],
        elementStyle: (dim, size, gutterSize) => ({ 'flex-basis': 'calc(' + size + '% - ' + gutterSize + 'px)' }),
        gutterStyle: (dim, gutterSize) => ({ 'flex-basis': gutterSize + 'px' })
      });

      $scope.$watchMulti(
        ['=vegaEditor.vis.params'],
        () => {
          const appState = getAppState();
          appState.vis.params = $scope.vegaEditor.vis.params;
          appState.save(true);
        }
      );
    }

    shouldShowSpyPanel() {
      return false;
    }

    getCodeWidth() {
      // TODO: make this dynamic, based on the width of the code window
      return 65;
    }

    formatJson() {
      this._format(compactStringify, {
        maxLength: this.getCodeWidth()
      });
    }

    formatHJson() {
      this._format(hjson.stringify, {
        condense: this.getCodeWidth(),
        bracesSameLine: true
      });
    }

    _format(stringify, opts) {
      // TODO: error handling and reporting
      try {
        const spec = hjson.parse(this.vis.params.spec);
        this.vis.params.spec = stringify(spec, opts);
      } catch (err) {
        // FIXME!
        alert(err);
      }
    }
  }

  return new VegaEditorController();
}
