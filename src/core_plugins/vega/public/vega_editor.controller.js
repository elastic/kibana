import compactStringify from 'json-stringify-pretty-compact';
import hjson from 'hjson';
import { Notifier } from 'ui/notify';
import { uiModules } from 'ui/modules';

const module = uiModules.get('kibana/vega', ['kibana']);
module.controller('VegaEditorController', ($scope /*, kbnUiAceKeyboardModeService*/) => {

  const notify = new Notifier({ location: 'Vega' });

  return new (class VegaEditorController {
    constructor() {
      $scope.aceLoaded = (editor) => {
        editor.$blockScrolling = Infinity;

        const session = editor.getSession();
        session.setTabSize(2);
        session.setUseSoftTabs(true);

        // FIXME: enabling this service breaks ACE text wrapping on width resize
        // kbnUiAceKeyboardModeService.initialize($scope, editor);

        this.aceEditor = editor;
      };

      $scope.formatJson = (event) => {
        this._format(event, compactStringify, {
          maxLength: this._getCodeWidth(),
        });
      };

      $scope.formatHJson = (event) => {
        this._format(event, hjson.stringify, {
          condense: this._getCodeWidth(),
          bracesSameLine: true,
          keepWsc: true,
        });
      };
    }

    _getCodeWidth() {
      return this.aceEditor.getSession().getWrapLimit();
    }

    _format(event, stringify, opts) {
      event.preventDefault();

      $scope.$apply(() => {
        try {
          const doc = this.aceEditor;
          const spec = hjson.parse(doc.getValue(), { legacyRoot: false, keepWsc: true });
          const spec2 = stringify(spec, opts);
          doc.setValue(spec2);

          // FIXME!
          // The dirty state of the spec is not updated via ACE's setValue -> onChange -> ace-ui
          // Repo: disable auto, use "format as ..." to change the spec, click save.
          // Observe that stale version is saved.
          // FIXME: Enabling this kills the editor UNDO after formatting (loss of comments with ->JSON)
          $scope.vis.params.spec = spec2;

        } catch (err) {
          notify.error(err);
        }
      });
    }
  })();
});
