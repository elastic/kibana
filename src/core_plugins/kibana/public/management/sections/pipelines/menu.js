import management from 'ui/management';
import routes from 'ui/routes';
import PipelinesProvider from 'ui/pipelines';
import template from './views/menu_app.html';
import './directives/pipeline_menu';

routes
.when('/management/elasticsearch/pipelines', {
  template: template,
  resolve: {
    pipelines: function ($route, Private, Notifier, courier) {
      const pipelines = Private(PipelinesProvider);
      const notify = new Notifier({ location: `Management - Pipelines` });

      return pipelines.pipelines.load()
      .then((result) => {
        return result;
      })
     .catch(notify.error);
    }
  }
});
