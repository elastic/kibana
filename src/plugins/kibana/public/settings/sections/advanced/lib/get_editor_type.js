define(function (require) {
  const _ = require('lodash');

  const NAMED_EDITORS = ['json', 'array', 'boolean', 'select'];
  const NORMAL_EDITOR = ['number', 'string', 'null', 'undefined'];

  /**
   * @param {object} advanced setting configuration object
   * @returns {string} the editor type to use when editing value
   */
  function getEditorType(conf) {
    if (_.contains(NAMED_EDITORS, conf.type)) return conf.type;
    if (_.contains(NORMAL_EDITOR, conf.type)) return 'normal';
  }

  return getEditorType;
});
