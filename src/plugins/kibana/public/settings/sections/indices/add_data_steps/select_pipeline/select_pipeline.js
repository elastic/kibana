import modules from 'ui/modules';
import template from './select_pipeline.html';
import _ from 'lodash';
import IngestProvider from 'ui/ingest';
import  * as ProcessorTypes from '../../add_data_steps/pipeline_setup/processors/view_models';
import './styles/styles.less';
import buildProcessorTypeArray from '../pipeline_setup/lib/build_processor_type_array';

modules.get('apps/settings')
  .directive('selectPipeline', function () {
    return {
      template: template,
      scope: {
        pipeline: '='
      },
      bindToController: true,
      controllerAs: 'selectPipeline',
      controller: function ($scope, Private, Notifier) {
        const ingest = Private(IngestProvider);
        const notify = new Notifier({ location: `Select Pipeline` });
        const processorTypes = buildProcessorTypeArray(ProcessorTypes);

        ingest.getPipelines()
        .then((pipelines) => {
          this.pipelines = pipelines;
        })
        .catch(notify.error);

        $scope.$watch('selectPipeline.pipelineName', (newValue) => {
          if (newValue) {
            delete this.pipeline;

            ingest.getPipeline(newValue)
            .then((result) => {
              const pipeline = {
                processors: []
              };

              _.forEach(result.processors, (esProcessor) => {
                const Type = _.find(processorTypes, { typeId: esProcessor.typeId }).Type;
                const processor = new Type('', esProcessor);
                processor.collapsed = true;
                pipeline.processors.push(processor);
              });

              this.pipeline = pipeline;
            })
            .catch(notify.error);
          } else {
            this.pipeline = { processors: [] };
          }
        });
      }
    };
  });

