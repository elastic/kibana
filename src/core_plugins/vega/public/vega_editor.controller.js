import { uiModules } from 'ui/modules';
import hjson from 'hjson';
import compactStringify from 'json-stringify-pretty-compact';

const module = uiModules.get('kibana/vega', ['kibana']);
module.controller('VegaEditorController', ($scope /*, $element, $timeout, kbnUiAceKeyboardModeService*/) => {

  return new (class VegaEditorController {
    constructor() {
      $scope.aceLoaded = editor => {
        editor.$blockScrolling = Infinity;

        const session = editor.getSession();
        session.setTabSize(2);
        session.setUseSoftTabs(true);

        // FIXME: enabling this service breaks ACE width auto-resize
        // kbnUiAceKeyboardModeService.initialize($scope, editor);

        this.aceEditor = editor;
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
      event.preventDefault();

      // FIXME: should I use $scope.$evalAsync() instead?
      $scope.$evalAsync(() => {
        // TODO: error handling and reporting
        try {
          const doc = this.aceEditor;
          const spec = hjson.parse(doc.getValue(), { legacyRoot: false, keepWsc: true });
          const spec2 = stringify(spec, opts);
          doc.setValue(spec2);

          // FIXME!  HACK!  For some reason, spec is not updated via ACE's setValue -> onChange -> ace-ui
          // $scope.vis.params.spec = spec2;

        } catch (err) {
          // FIXME!
          alert(err);
        }
        this.aceEditor.focus();
      });
    }
  })();
});
