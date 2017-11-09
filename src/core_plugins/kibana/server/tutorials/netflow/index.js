import { PARAM_TYPES } from '../../../common/tutorials/param_types';
import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';

export function netflowSpecProvider() {
  return {
    id: 'netflow',
    name: 'Netflow',
    category: TUTORIAL_CATEGORY.SECURITY,
    shortDescription: 'Collect Netflow records sent by a Netflow exporter',
    longDescription: 'The Logstash Netflow module simplifies the collection, normalization, and visualization of network flow data. ' +
      'With a single command, the module parses network flow data, indexes the events into Elasticsearch, and installs a suite of Kibana ' +
      'dashboards to get you exploring your data immediately. Logstash modules support Netflow Version 5 and 9. [Learn more]' +
      '({config.elastic_docs.website_url}/guide/en/logstash/{config.elastic_docs.link_version}/netflow-module.html) about the Netflow ' +
      'module.',
    //iconPath: '', TODO
    completionTimeMinutes: 10,
    //previewImagePath: 'kibana-apache.png', TODO
    params: [
      {
        id: 'netflow_var_input_udp_port',
        label: 'netflow.var.input.udp.port',
        type: PARAM_TYPES.NUMBER,
        defaultValue: 2055
      }
    ],
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              {
                title: 'Download and install Logstash',
                textPre: 'Skip this step if Logstash is already installed. First time using Logstash? See the ' +
                         '[Getting Started Guide]({config.elastic_docs.website_url}/guide/en/logstash/{config.elastic_docs.link_version}' +
                         '/getting-started-with-logstash.html).',
                commands: [
                  'curl -L -O https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.tar.gz',
                  'tar xzvf logstash-{config.kibana.version}.tar.gz'
                ]
              },
              {
                title: 'Setup the Netflow module',
                textPre: 'In the Logstash install directory, run the following command to setup the Netflow module.',
                commands: [
                  './bin/logstash --modules netflow --setup',
                ],
                textPost: 'The --setup option creates a `netflow-*` index pattern in Elasticsearch and imports' +
                  ' Kibana dashboards and visualizations. Running `--setup` is a one-time setup step. Omit this step' +
                  ' for subsequent runs of the module to avoid overwriting existing Kibana dashboards.'
              },
              {
                title: 'Start Logstash',
                commands: [
                  './bin/logstash --modules netflow -M netflow.var.input.udp.port={params.netflow_var_input_udp_port}'
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}
