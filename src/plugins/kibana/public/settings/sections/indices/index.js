import _ from 'lodash';
import registry from 'ui/registry/settings_sections';
import 'plugins/kibana/settings/sections/indices/directives/kbn_settings_indices';
import 'plugins/kibana/settings/sections/indices/_create';
import 'plugins/kibana/settings/sections/indices/_edit';
import 'plugins/kibana/settings/sections/indices/_field_editor';
import 'plugins/kibana/settings/sections/indices/filebeat/index';
import 'plugins/kibana/settings/sections/indices/upload/index';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import indexTemplate from 'plugins/kibana/settings/sections/indices/index.html';


// add a dependency to all of the subsection routes
uiRoutes
.defaults(/settings\/indices/, {
  resolve: {
    indexPatternIds: function (courier) {
      return courier.indexPatterns.getIds();
    }
  }
});

uiRoutes.when('/settings/indices', {
  template: indexTemplate
});

registry.register(_.constant({
  order: 1,
  name: 'indices',
  display: 'Indices',
  url: '#/settings/indices'
}));
