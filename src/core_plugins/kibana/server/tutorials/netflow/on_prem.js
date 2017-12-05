import { PARAM_TYPES } from '../../../common/tutorials/param_types';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { LOGSTASH_INSTRUCTIONS } from '../../../common/tutorials/logstash_instructions';

export const ON_PREM_INSTRUCTIONS = {
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
              title: 'Set up and run the Netflow module',
              textPre: 'In the Logstash install directory, run the following command to set up the Netflow module.',
              commands: [
                './bin/logstash --modules netflow -M netflow.var.input.udp.port={params.netflow_var_input_udp_port} --setup',
              ],
              textPost: 'The `--setup` option creates a `netflow-*` index pattern in Elasticsearch and imports' +
                ' Kibana dashboards and visualizations. Omit this option for subsequent runs of the module to avoid' +
                '  overwriting existing Kibana dashboards.'
            }
          ]
        }
      ]
    }
  ]
};
