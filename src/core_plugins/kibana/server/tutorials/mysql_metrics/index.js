import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function mysqlMetricsSpecProvider() {
  return {
    id: 'mysqlMetrics',
    name: 'MySQL metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Fetches internal metrics from MySQL.',
    longDescription: 'The mysql Metricbeat module fetches internal metrics from the MySQL server.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-mysql.html)' +
                     ' about the mysql module.',
    //iconPath: '', TODO
    completionTimeMinutes: 10,
    //previewImagePath: 'kibana-mysql.png', TODO
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
