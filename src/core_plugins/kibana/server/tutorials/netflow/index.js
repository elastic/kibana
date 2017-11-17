import { PARAM_TYPES } from '../../../common/tutorials/param_types';
import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { LOGSTASH_INSTRUCTIONS } from '../../../common/tutorials/logstash_instructions';

export function netflowSpecProvider() {
  return {
    id: 'netflow',
    name: 'Netflow',
    category: TUTORIAL_CATEGORY.SECURITY,
    shortDescription: 'Collect Netflow records sent by a Netflow exporter',
    longDescription: 'The Logstash Netflow module simplifies the collection, normalization, and visualization of network flow data. ' +
      'With a single command, the module parses network flow data, indexes the events into Elasticsearch, and installs a suite of Kibana ' +
      'dashboards to get you exploring your data immediately. Logstash modules support Netflow Version 5 and 9. [Learn more]' +
      '({config.docs.logstash}/netflow-module.html) about the Netflow module',
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
              ...LOGSTASH_INSTRUCTIONS.INSTALL.OSX,
              {
                title: 'Set up the Netflow module',
                textPre: 'In the Logstash install directory, run the following command to set up the Netflow module.',
                commands: [
                  './bin/logstash --modules netflow --setup',
                ],
                textPost: 'The `--setup` option creates a `netflow-*` index pattern in Elasticsearch and imports' +
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
