define(function (require) {
  var _ = require('lodash');
  var getValType = require('./get_val_type');
  var getEditorType = require('./get_editor_type');

  /**
   * @param {object} advanced setting definition object
   * @param {object} name of setting
   * @param {object} current value of setting
   * @returns {object} the editable config object
   */
  function toEditableConfig(def, name, value) {
    var isCustom = !def;
    if (isCustom) def = {};

    var conf = {
      name,
      value,
      isCustom,
      readonly: !!def.readonly,
      defVal: def.value,
      type: getValType(def, value),
      description: def.description,
      options: def.options
    };

    var editor = getEditorType(conf);
    conf.json = editor === 'json';
    conf.select = editor === 'select';
    conf.bool = editor === 'boolean';
    conf.array = editor === 'array';
    conf.normal = editor === 'normal';
    conf.tooComplex = !editor;

    return conf;
  }

  return toEditableConfig;
});
