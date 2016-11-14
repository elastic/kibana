import _ from 'lodash';
import editorHtml from 'ui/agg_types/controls/script_lang.html';
import StringParamTypesBaseProvider from 'ui/agg_types/param_types/string';
import { GetScriptingLangsProvider } from 'ui/scripting_langs';

export default function ScriptingLangAggParamFactory(Private) {
  const StringAggParam = Private(StringParamTypesBaseProvider);
  const getScriptingLangs = Private(GetScriptingLangsProvider);

  class ScriptingLangAggParam extends StringAggParam {
    constructor(config) {
      super(config);

      this.default = 'painless';
      this.editor = editorHtml;
      this.controller = class ScriptingLangParamController {
        constructor($scope) {
          this.loading = true;

          getScriptingLangs()
            .then(scriptingLangs => {
              this.loading = false;
              this.scriptingLangs = scriptingLangs;
            });
        };
      };
    }
  }

  return ScriptingLangAggParam;
};
