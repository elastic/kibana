import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function dockerMetricsSpecProvider() {
  return {
    id: 'dockerMetrics',
    name: 'Docker metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Fetch metrics about your Docker containers.',
    longDescription: 'The `docker` Metricbeat module fetches metrics from the Docker server.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-docker.html).',
    euiIconType: 'logoDocker',
    artifacts: {
      dashboards: [
        {
          id: 'AV4REOpp5NkDleZmzKkE',
          linkLabel: 'Docker metrics dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-docker.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/docker_metrics/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
