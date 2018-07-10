/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { INSTRUCTION_VARIANT } from './instruction_variant';
import { TRYCLOUD_OPTION1, TRYCLOUD_OPTION2 } from './onprem_cloud_instructions';

export const METRICBEAT_INSTRUCTIONS = {
  INSTALL: {
    OSX: {
      title: 'Download and install Metricbeat',
      textPre: 'First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'tar xzvf metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'cd metricbeat-{config.kibana.version}-darwin-x86_64/',
      ]
    },
    DEB: {
      title: 'Download and install Metricbeat',
      textPre: 'First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-amd64.deb',
        'sudo dpkg -i metricbeat-{config.kibana.version}-amd64.deb'
      ],
      textPost: 'Looking for the 32-bit packages? See the [Download page](https://www.elastic.co/downloads/beats/metricbeat).'
    },
    RPM: {
      title: 'Download and install Metricbeat',
      textPre: 'First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-x86_64.rpm',
        'sudo rpm -vi metricbeat-{config.kibana.version}-x86_64.rpm'
      ],
      textPost: 'Looking for the 32-bit packages? See the [Download page](https://www.elastic.co/downloads/beats/metricbeat).'
    },
    WINDOWS: {
      title: 'Download and install Metricbeat',
      textPre: 'First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).\n' +
               '1. Download the Metricbeat Windows zip file from the [Download](https://www.elastic.co/downloads/beats/metricbeat) page.\n' +
               '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
               '3. Rename the `metricbeat-{config.kibana.version}-windows` directory to `Metricbeat`.\n' +
               '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
               ' **Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n' +
               '5. From the PowerShell prompt, run the following commands to install Metricbeat as a Windows service.',
      commands: [
        'PS > cd C:\\Program Files\\Metricbeat',
        'PS C:\\Program Files\\Metricbeat> .\\install-service-metricbeat.ps1'
      ],
      textPost: 'Modify the settings under `output.elasticsearch` in the ' +
                '`C:\\Program Files\\Metricbeat\\metricbeat.yml` file to point to your Elasticsearch installation.'
    }
  },
  START: {
    OSX: {
      title: 'Start Metricbeat',
      textPre: 'The `setup` command loads the Kibana dashboards.' +
                ' If the dashboards are already set up, omit this command.',
      commands: [
        './metricbeat setup',
        './metricbeat -e',
      ]
    },
    DEB: {
      title: 'Start Metricbeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'sudo metricbeat setup',
        'sudo service metricbeat start',
      ]
    },
    RPM: {
      title: 'Start Metricbeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'sudo metricbeat setup',
        'sudo service metricbeat start',
      ],
    },
    WINDOWS: {
      title: 'Start Metricbeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'PS C:\\Program Files\\Metricbeat> metricbeat.exe setup',
        'PS C:\\Program Files\\Metricbeat> Start-Service metricbeat',
      ]
    }
  },
  CONFIG: {
    OSX: {
      title: 'Edit the configuration',
      textPre: 'Modify `metricbeat.yml` to set the connection information:',
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user, ' +
                '`<es_url>` is the URL of Elasticsearch, and `<kibana_url>` is the URL of Kibana.'
    },
    DEB: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/metricbeat/metricbeat.yml` to set the connection information:',
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user, ' +
                '`<es_url>` is the URL of Elasticsearch, and `<kibana_url>` is the URL of Kibana.'
    },
    RPM: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/metricbeat/metricbeat.yml` to set the connection information:',
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user, ' +
                '`<es_url>` is the URL of Elasticsearch, and `<kibana_url>` is the URL of Kibana.'
    },
    WINDOWS: {
      title: 'Edit the configuration',
      textPre: 'Modify `C:\\Program Files\\Metricbeat\\metricbeat.yml` to set the connection information:',
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user, ' +
                '`<es_url>` is the URL of Elasticsearch, and `<kibana_url>` is the URL of Kibana.'
    }
  }
};

export const METRICBEAT_CLOUD_INSTRUCTIONS = {
  CONFIG: {
    OSX: {
      title: 'Edit the configuration',
      textPre: 'Modify `metricbeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    DEB: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/metricbeat/metricbeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    RPM: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/metricbeat/metricbeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    WINDOWS: {
      title: 'Edit the configuration',
      textPre: 'Modify `C:\\Program Files\\Filebeat\\metricbeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    }
  }
};

export function metricbeatEnableInstructions(moduleName) {
  return {
    OSX: {
      title: 'Enable and configure the ' + moduleName + ' module',
      textPre: 'From the installation directory, run:',
      commands: [
        './metricbeat modules enable ' + moduleName,
      ],
      textPost: 'Modify the settings in the `modules.d/' + moduleName + '.yml` file.'
    },
    DEB: {
      title: 'Enable and configure the ' + moduleName + ' module',
      commands: [
        'sudo metricbeat modules enable ' + moduleName,
      ],
      textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/' + moduleName + '.yml` file.'
    },
    RPM: {
      title: 'Enable and configure the ' + moduleName + ' module',
      commands: [
        'sudo metricbeat modules enable ' + moduleName,
      ],
      textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/' + moduleName + '.yml` file.'
    },
    WINDOWS: {
      title: 'Enable and configure the ' + moduleName + ' module',
      textPre: 'From the `C:\\Program Files\\Metricbeat` folder, run:',
      commands: [
        'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable ' + moduleName,
      ],
      textPost: 'Modify the settings in the `modules.d/' + moduleName + '.yml` file.'
    }
  };
}

export function metricbeatStatusCheck(moduleName) {
  return {
    title: 'Module status',
    text: 'Check that data is received from the Metricbeat `' + moduleName + '` module',
    btnLabel: 'Check data',
    success: 'Data successfully received from this module',
    error: 'No data has been received from this module yet',
    esHitsCheck: {
      index: 'metricbeat-*',
      query: {
        bool: {
          filter: {
            term: {
              'metricset.module': moduleName
            }
          }
        }
      }
    }
  };
}

export function onPremInstructions(moduleName) {
  return {
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              METRICBEAT_INSTRUCTIONS.CONFIG.OSX,
              metricbeatEnableInstructions(moduleName).OSX,
              METRICBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              METRICBEAT_INSTRUCTIONS.CONFIG.DEB,
              metricbeatEnableInstructions(moduleName).DEB,
              METRICBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              METRICBEAT_INSTRUCTIONS.CONFIG.RPM,
              metricbeatEnableInstructions(moduleName).RPM,
              METRICBEAT_INSTRUCTIONS.START.RPM
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              METRICBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              metricbeatEnableInstructions(moduleName).WINDOWS,
              METRICBEAT_INSTRUCTIONS.START.WINDOWS
            ]
          }
        ],
        statusCheck: metricbeatStatusCheck(moduleName)
      }
    ]
  };
}

export function onPremCloudInstructions(moduleName) {
  return {
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              METRICBEAT_INSTRUCTIONS.CONFIG.OSX,
              metricbeatEnableInstructions(moduleName).OSX,
              METRICBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              METRICBEAT_INSTRUCTIONS.CONFIG.DEB,
              metricbeatEnableInstructions(moduleName).DEB,
              METRICBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              METRICBEAT_INSTRUCTIONS.CONFIG.RPM,
              metricbeatEnableInstructions(moduleName).RPM,
              METRICBEAT_INSTRUCTIONS.START.RPM
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              METRICBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              metricbeatEnableInstructions(moduleName).WINDOWS,
              METRICBEAT_INSTRUCTIONS.START.WINDOWS
            ]
          }
        ],
        statusCheck: metricbeatStatusCheck(moduleName)
      }
    ]
  };
}

export function cloudInstructions(moduleName) {
  return {
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.OSX,
              metricbeatEnableInstructions(moduleName).OSX,
              METRICBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.DEB,
              metricbeatEnableInstructions(moduleName).DEB,
              METRICBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.RPM,
              metricbeatEnableInstructions(moduleName).RPM,
              METRICBEAT_INSTRUCTIONS.START.RPM
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.WINDOWS,
              metricbeatEnableInstructions(moduleName).WINDOWS,
              METRICBEAT_INSTRUCTIONS.START.WINDOWS
            ]
          }
        ],
        statusCheck: metricbeatStatusCheck(moduleName)
      }
    ]
  };
}
