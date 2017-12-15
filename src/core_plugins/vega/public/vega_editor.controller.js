import { uiModules } from 'ui/modules';
import hjson from 'hjson';
import compactStringify from 'json-stringify-pretty-compact';

const module = uiModules.get('kibana/vega', ['kibana']);
module.controller('VegaEditorController', ($scope /*, $element, $timeout, kbnUiAceKeyboardModeService*/) => {

  return new (class VegaEditorController {
    constructor() {
      $scope.aceLoaded = editor => {
        this.aceEditor = editor;
        // this.aceSession = editor.getSession();
        // this.aceSession.setTabSize(2);
        // this.aceSession.setUseSoftTabs(false);

        editor.$blockScrolling = Infinity;

        // FIXME: enabling this service breaks ACE width auto-resize
        // kbnUiAceKeyboardModeService.initialize($scope, editor);
      };

      $scope.formatJson = (event) => {
        this._format(event, compactStringify, {
          maxLength: this.aceEditor.getSession().getWrapLimit(),
        });
      };

      $scope.formatHJson = (event) => {
        this._format(event, hjson.stringify, {
          condense: this.aceEditor.getSession().getWrapLimit(),
          bracesSameLine: true,
          keepWsc: true,
        });
      };
    }

    _format(event, stringify, opts) {
      // TODO: error handling and reporting
      try {
        event.preventDefault();

        const session = this.aceEditor.getSession();
        const spec = hjson.parse(session.getValue(), { legacyRoot: false, keepWsc: true });
        session.setValue(stringify(spec, opts));

      } catch (err) {
        // FIXME!
        alert(err);
      }
      this.aceEditor.focus();
    }
  })();
});
