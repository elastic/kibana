import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function apacheMetricsSpecProvider() {
  return {
    id: 'apacheMetrics',
    name: 'Apache metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Fetches internal metrics from the Apache 2 HTTP server.',
    longDescription: 'The apache Metricbeat module fetches internal metrics from the Apache 2 HTTP server.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-apache.html)' +
                     ' about the apache module.',
    //iconPath: '', TODO
    completionTimeMinutes: 10,
    //previewImagePath: 'kibana-apache.png', TODO
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
