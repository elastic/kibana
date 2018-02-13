import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function mysqlMetricsSpecProvider() {
  return {
    id: 'mysqlMetrics',
    name: 'MySQL metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Fetch internal metrics from MySQL.',
    longDescription: 'The `mysql` Metricbeat module fetches internal metrics from the MySQL server.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-mysql.html).',
    euiIconType: 'logoMySQL',
    artifacts: {
      dashboards: [
        {
          id: '66881e90-0006-11e7-bf7f-c9acc3d3e306',
          linkLabel: 'MySQL metrics dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-mysql.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/mysql_metrics/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
