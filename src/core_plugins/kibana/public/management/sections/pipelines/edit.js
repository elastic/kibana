import management from 'ui/management';
import routes from 'ui/routes';
import PipelinesProvider from 'ui/pipelines';
import Pipeline from 'ui/pipelines/pipeline/view_model';
import 'ui/directives/bread_crumbs';
import template from './views/edit_app.html';
import './directives/pipeline_edit';
import processorRegistryProvider from 'ui/registry/pipelines_processors';

routes
.when('/management/elasticsearch/pipeline/:id', {
  template: template,
  resolve: {
    pipeline: function ($route, Private, Notifier) {
      const pipelines = Private(PipelinesProvider);
      const notify = new Notifier({ location: `Management - Pipelines` });
      const processorRegistry = Private(processorRegistryProvider);

      return pipelines.pipeline.load($route.current.params.id)
      .then((result) => {
        return new Pipeline(processorRegistry, result);
      })
     .catch(notify.error);
    }
  }
})
.when('/management/elasticsearch/pipeline', {
  template: template,
  resolve: {
    pipeline: function (Private) {
      const processorRegistry = Private(processorRegistryProvider);

      return new Pipeline(processorRegistry);
    }
  }
});
