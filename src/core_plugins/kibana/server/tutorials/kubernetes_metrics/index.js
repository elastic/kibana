import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function kubernetesMetricsSpecProvider() {
  return {
    id: 'kubernetesMetrics',
    name: 'Kubernetes metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Fetch metrics from your Kubernetes installation.',
    longDescription: 'The `kubernetes` Metricbeat module fetches metrics from the Kubernetes APIs.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-kubernetes.html).',
    euiIconType: 'logoKubernetes',
    artifacts: {
      dashboards: [
        {
          id: 'AV4RGUqo5NkDleZmzKuZ',
          linkLabel: 'Kubernetes metrics dashboard',
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.metricbeat}/exported-fields-kubernetes.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/kubernetes_metrics/screenshot.png',
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
