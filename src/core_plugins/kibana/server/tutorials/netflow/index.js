import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function netflowSpecProvider() {
  return {
    id: 'netflow',
    name: 'Netflow',
    category: TUTORIAL_CATEGORY.SECURITY,
    shortDescription: 'Collect Netflow records sent by a Netflow exporter.',
    longDescription: 'The Logstash Netflow module collects and parses network flow data, ' +
      ' indexes the events into Elasticsearch, and installs a suite of Kibana dashboards.' +
      ' This module support Netflow Version 5 and 9.' +
      ' [Learn more]({config.docs.logstash}/netflow-module.html).',
    completionTimeMinutes: 10,
    //previewImagePath: 'kibana-apache.png', TODO
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
