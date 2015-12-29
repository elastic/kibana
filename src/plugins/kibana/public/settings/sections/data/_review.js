import routes from 'ui/routes';
import modules from 'ui/modules';
import template from 'plugins/kibana/settings/sections/data/_review.html';
import storeProvider from 'ui/store';

routes.when('/settings/data', {
  template: template
});

modules.get('apps/settings')
  .controller('settingsDataReview', function ($scope, Private) {
    var store = Private(storeProvider);
  });
