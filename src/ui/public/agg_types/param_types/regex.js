define(function (require) {
  return function RegexAggParamFactory(Private) {
    let _ = require('lodash');

    let BaseAggParam = Private(require('ui/agg_types/param_types/base'));
    let editorHtml = require('ui/agg_types/controls/regular_expression.html');

    _.class(RegexAggParam).inherits(BaseAggParam);
    function RegexAggParam(config) {
      // Java RegExp flags
      let flags = [
        'CANON_EQ',
        'CASE_INSENSITIVE',
        'COMMENTS',
        'DOTALL',
        'LITERAL',
        'MULTILINE',
        'UNICODE_CASE',
        'UNICODE_CHARACTER_CLASS',
        'UNIX_LINES'
      ];

      _.defaults(config, { pattern: '', flags: flags });
      RegexAggParam.Super.call(this, config);
    }

    RegexAggParam.prototype.editor = editorHtml;

    /**
     * Disabled state of the agg param
     *
     * @return {bool}
     */
    RegexAggParam.prototype.disabled = function (aggConfig) {
      return false;
    };

    /**
     * Write the aggregation parameter.
     *
     * @param  {AggConfig} aggConfig - the entire configuration for this agg
     * @param  {object} output - the result of calling write on all of the aggregations
     *                         parameters.
     * @param  {object} output.params - the final object that will be included as the params
     *                               for the agg
     * @return {undefined}
     */
    RegexAggParam.prototype.write = function (aggConfig, output) {
      let param = aggConfig.params[this.name];
      let paramType = aggConfig.type.params.byName[this.name];

      // clear aggParam if pattern is not set or is disabled
      if (!param || !param.pattern || !param.pattern.length || paramType.disabled(aggConfig)) {
        return;
      }

      let obj = {
        pattern: param.pattern
      };

      // include any selected flags
      if (_.isArray(param.flags) && param.flags.length) {
        obj.flags = param.flags.join('|');
      }

      output.params[this.name] = obj;
    };

    return RegexAggParam;
  };
});
