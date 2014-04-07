define(function (require, module, exports) {
  require('directives/table');
  require('./saved_searches/service');
  require('./directives/timechart');
  require('./directives/field_chooser');
  require('./controllers/discover');
});