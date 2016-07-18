define(function (require, module, exports) {
  require('plugins/kibana/discover/saved_searches/saved_searches');
  require('plugins/kibana/discover/directives/timechart');
  require('ui/navbar_extensions');
  require('ui/collapsible_sidebar');
  require('plugins/kibana/discover/components/field_chooser/field_chooser');
  require('plugins/kibana/discover/controllers/discover');
  require('plugins/kibana/discover/styles/main.less');

  // preload
  require('ui/doc_table/components/table_row');

  var savedObjectRegistry = require('ui/saved_objects/saved_object_registry');
  savedObjectRegistry.register(require('plugins/kibana/discover/saved_searches/saved_search_register'));
});
