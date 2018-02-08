import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function nginxLogsSpecProvider() {
  return {
    id: 'nginxLogs',
    name: 'Nginx logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse access and error logs created by the Nginx HTTP server.',
    longDescription: 'The `nginx` Filebeat module parses access and error logs created by the Nginx HTTP server.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-nginx.html).',
    euiIconType: 'logoNginx',
    artifacts: {
      dashboards: [
        {
          id: '55a9e6e0-a29e-11e7-928f-5dbe6f6f5519',
          linkLabel: 'Nginx logs dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-nginx.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/nginx_logs/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
