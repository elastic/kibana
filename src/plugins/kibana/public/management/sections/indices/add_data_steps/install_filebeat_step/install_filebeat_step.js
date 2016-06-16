import modules from 'ui/modules';
import template from './install_filebeat_step.html';
import 'ui/pattern_checker';
import { patternToIngest } from '../../../../../../common/lib/convert_pattern_and_ingest_name';
import { filebeat as docLinks } from '../../../../../../../../ui/public/documentation_links/documentation_links';
import './styles/_add_data_install_filebeat_step.less';

modules.get('apps/management')
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
        this.docLinks = docLinks;
      }
    };
  });

