import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function systemLogsSpecProvider() {
  return {
    id: 'systemLogs',
    name: 'System logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse logs written by the local Syslog server.',
    longDescription: 'The `system` Filebeat module collects and parses logs created by the system logging service of common ' +
                     ' Unix/Linux based distributions. This module is not available on Windows.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-system.html).',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-syslog-dashboard',
          linkLabel: 'System logs dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-system.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/system_logs/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
