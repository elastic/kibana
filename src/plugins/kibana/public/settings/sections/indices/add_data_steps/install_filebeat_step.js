import modules from 'ui/modules';
import template from 'plugins/kibana/settings/sections/indices/add_data_steps/install_filebeat_step.html';
import { patternToIngest } from '../../../../../common/lib/convert_pattern_and_ingest_name';

modules.get('apps/settings')
  .directive('installFilebeatStep', function () {
    return {
      template: template,
      scope: {
        results: '='
      },
      bindToController: true,
      controllerAs: 'installStep',
      controller: function ($scope) {
        this.pipelineId = patternToIngest(this.results.indexPattern.id);
      }
    };
  });

