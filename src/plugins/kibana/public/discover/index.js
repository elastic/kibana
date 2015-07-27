define(function (require, module, exports) {
  require('plugins/kibana/discover/saved_searches/saved_searches');
  require('plugins/kibana/discover/directives/timechart');
  require('ui/collapsible_sidebar');
  require('plugins/kibana/discover/components/field_chooser/field_chooser');
  require('plugins/kibana/discover/controllers/discover');
  require('plugins/kibana/discover/styles/main.less');
});
