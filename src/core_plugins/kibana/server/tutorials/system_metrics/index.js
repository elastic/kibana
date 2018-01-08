import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function systemMetricsSpecProvider() {
  return {
    id: 'systemMetrics',
    name: 'System metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Collects CPU, memory, network, and disk statistics from the host.',
    longDescription: 'The `system` Metricbeat module collects CPU, memory, network, and disk statistics from the host.' +
                     ' It collects system wide statistics as well as per process and per filesystem statistics.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-system.html)' +
                     ' about the system module.',
    //iconPath: '', TODO
    artifacts: {
      dashboards: [
        {
          title: 'Metricbeat-system-overview',
          linkLabel: 'System metrics dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-system.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/system_metrics/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
