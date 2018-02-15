import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function mysqlLogsSpecProvider() {
  return {
    id: 'mysqlLogs',
    name: 'MySQL logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse error and slow logs created by MySQL.',
    longDescription: 'The `mysql` Filebeat module parses error and slow logs created by MySQL.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-mysql.html).',
    euiIconType: 'logoMySQL',
    artifacts: {
      dashboards: [
        {
          id: 'Filebeat-MySQL-Dashboard',
          linkLabel: 'MySQL logs dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-mysql.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/mysql_logs/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
