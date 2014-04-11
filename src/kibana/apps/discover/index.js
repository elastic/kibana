define(function (require, module, exports) {
  require('directives/table');
  require('./saved_searches/saved_searches');
  require('./directives/timechart');
  require('./directives/field_chooser');
  require('./controllers/discover');
  require('css!./styles/main.css');
});