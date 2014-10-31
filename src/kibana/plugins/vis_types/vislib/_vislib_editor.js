define(function (require) {
  var _ = require('lodash');
  var baseOptions = require('text!plugins/vis_types/vislib/editors/base_options.html');
  var typeEditors = {
    histogram: require('text!plugins/vis_types/vislib/editors/histogram.html')
  };

  var VislibEditorService = {
    create: function (name) {
      var compiler = _.template(baseOptions);
      var typeOptions = typeEditors[name] || '';
      return compiler({ type_options: typeOptions });
    }
  };

  return VislibEditorService;
});
