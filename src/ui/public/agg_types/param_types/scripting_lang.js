import _ from 'lodash';
import editorHtml from 'ui/agg_types/controls/scripting_lang.html';
import StringParamTypesBaseProvider from 'ui/agg_types/param_types/string';
export default function ScriptingLangAggParamFactory(Private) {

  let StringAggParam = Private(StringParamTypesBaseProvider);

  _.class(ScriptingLangAggParam).inherits(StringAggParam);
  function ScriptingLangAggParam(config) {
    ScriptingLangAggParam.Super.call(this, config);
  }

  ScriptingLangAggParam.prototype.editor = editorHtml;

  return ScriptingLangAggParam;
};
