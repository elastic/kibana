import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function redisMetricsSpecProvider() {
  return {
    id: 'redisMetrics',
    name: 'Redis metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Fetch internal metrics from Redis.',
    longDescription: 'The `redis` Metricbeat module fetches internal metrics from the Redis server.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-redis.html).',
    euiIconType: 'logoRedis',
    artifacts: {
      dashboards: [
        {
          id: 'AV4YjZ5pux-M-tCAunxK',
          linkLabel: 'Redis metrics dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-redis.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/redis_metrics/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
