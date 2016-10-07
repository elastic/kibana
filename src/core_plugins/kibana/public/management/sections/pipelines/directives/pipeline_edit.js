import management from 'ui/management';
import modules from 'ui/modules';
import template from '../views/pipeline_edit.html';
import PipelinesProvider from 'ui/pipelines';
import Pipeline from 'ui/pipelines/pipeline/view_model';
import saveTemplate from '../partials/_pipeline_save.html';
import '../styles/_pipeline_edit.less';
import './pipeline_output';
import './field_select';
import './processor_ui_container';
import './processor_select';
import './processor_id';
import './processor_input';
import './pipeline_details';
import './failure_action';
import './pipeline_input';
import './pipeline_setup';
import './pipeline_header';
import './pipeline_on_failure';
import './input_output_controls';
import '../processors';
import slugifyId from 'ui/utils/slugify_id';

const app = modules.get('apps/management');

app.directive('pipelineEdit', function () {
  return {
    restrict: 'E',
    template: template,
    controller: function ($scope, $route, kbnUrl, Private, Notifier) {
      const pipelines = Private(PipelinesProvider);
      const notify = new Notifier({ location: `Ingest Pipeline Setup` });
      $scope.pipeline = $route.current.locals.pipeline;

      $scope.topNavOpts = {
        pipeline: $scope.pipeline,
        doSave: () => {
          const pipeline = $scope.pipeline;
          pipeline.pipelineId = slugifyId(pipeline.pipelineId);

          return pipelines.pipeline.save(pipeline.model)
          .then((result) => {
            notify.info(`Pipeline '${pipeline.pipelineId}' saved!`);
            $scope.kbnTopNav.close();
          })
          .catch(notify.error);
        }
      };

      $scope.topNavMenu = [{
        key: 'save',
        template: saveTemplate,
        description: 'Save Pipeline'
      },
      {
        key: 'close',
        description: 'Cancel Unsaved Changes',
        run: function () { kbnUrl.change('/management/elasticsearch/pipelines', {}); }
      }];
    }
  };
});
