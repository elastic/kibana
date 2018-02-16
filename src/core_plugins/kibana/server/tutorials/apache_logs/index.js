import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function apacheLogsSpecProvider() {
  return {
    id: 'apacheLogs',
    name: 'Apache logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse access and error logs created by the Apache HTTP server.',
    longDescription: 'The apache2 Filebeat module parses access and error logs created by the Apache 2 HTTP server.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-apache2.html).',
    euiIconType: 'logoApache',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-Apache2-Dashboard',
          linkLabel: 'Apache2 logs dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-apache2.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/apache_logs/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
