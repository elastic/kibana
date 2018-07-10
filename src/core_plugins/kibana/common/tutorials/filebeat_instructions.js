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
import {
  TRYCLOUD_OPTION1,
  TRYCLOUD_OPTION2
} from './onprem_cloud_instructions';

export const FILEBEAT_INSTRUCTIONS = {
  INSTALL: {
    OSX: {
      title: 'Download and install Filebeat',
      textPre: 'First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'tar xzvf filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'cd filebeat-{config.kibana.version}-darwin-x86_64/',
      ]
    },
    DEB: {
      title: 'Download and install Filebeat',
      textPre: 'First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-amd64.deb',
        'sudo dpkg -i filebeat-{config.kibana.version}-amd64.deb'
      ],
      textPost: 'Looking for the 32-bit packages? See the [Download page](https://www.elastic.co/downloads/beats/filebeat).'
    },
    RPM: {
      title: 'Download and install Filebeat',
      textPre: 'First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-x86_64.rpm',
        'sudo rpm -vi filebeat-{config.kibana.version}-x86_64.rpm'
      ],
      textPost: 'Looking for the 32-bit packages? See the [Download page](https://www.elastic.co/downloads/beats/filebeat).'
    },
    WINDOWS: {
      title: 'Download and install Filebeat',
      textPre: 'First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).\n' +
               '1. Download the Filebeat Windows zip file from the [Download](https://www.elastic.co/downloads/beats/filebeat) page.\n' +
               '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
               '3. Rename the `filebeat-{config.kibana.version}-windows` directory to `Filebeat`.\n' +
               '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
               ' **Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n' +
               '5. From the PowerShell prompt, run the following commands to install Filebeat as a Windows service.',
      commands: [
        'PS > cd C:\\Program Files\\Filebeat',
        'PS C:\\Program Files\\Filebeat> .\\install-service-filebeat.ps1'
      ],
      textPost: 'Modify the settings under `output.elasticsearch` in the ' +
                '`C:\\Program Files\\Filebeat\\filebeat.yml` file to point to your Elasticsearch installation.'
    }
  },
  START: {
    OSX: {
      title: 'Start Filebeat',
      textPre: 'The `setup` command loads the Kibana dashboards.' +
                ' If the dashboards are already set up, omit this command.',
      commands: [
        './filebeat setup',
        './filebeat -e',
      ]
    },
    DEB: {
      title: 'Start Filebeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'sudo filebeat setup',
        'sudo service filebeat start',
      ]
    },
    RPM: {
      title: 'Start Filebeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'sudo filebeat setup',
        'sudo service filebeat start',
      ],
    },
    WINDOWS: {
      title: 'Start Filebeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'PS C:\\Program Files\\Filebeat> filebeat.exe setup',
        'PS C:\\Program Files\\Filebeat> Start-Service filebeat',
      ]
    }
  },
  CONFIG: {
    OSX: {
      title: 'Edit the configuration',
      textPre: 'Modify `filebeat.yml` to set the connection information:',
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
      textPre: 'Modify `/etc/filebeat/filebeat.yml` to set the connection information:',
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
      textPre: 'Modify `/etc/filebeat/filebeat.yml` to set the connection information:',
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
      textPre: 'Modify `C:\\Program Files\\Filebeat\\filebeat.yml` to set the connection information:',
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
  },
  PLUGINS: {
    GEOIP_AND_UA: {
      title: 'Install Elasticsearch GeoIP and user agent plugins',
      textPre: 'This module requires two Elasticsearch plugins that are not ' +
               'installed by default.\n\nFrom the Elasticsearch installation folder, run:',
      commands: [
        'bin/elasticsearch-plugin install ingest-geoip',
        'bin/elasticsearch-plugin install ingest-user-agent'
      ]
    },
    GEOIP: {
      title: 'Install Elasticsearch GeoIP plugin',
      textPre: 'This module requires an Elasticsearch plugin that is not ' +
               'installed by default.\n\nFrom the Elasticsearch installation folder, run:',
      commands: [
        'bin/elasticsearch-plugin install ingest-geoip'
      ]
    }
  }
};

export const FILEBEAT_CLOUD_INSTRUCTIONS = {
  CONFIG: {
    OSX: {
      title: 'Edit the configuration',
      textPre: 'Modify `filebeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    DEB: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/filebeat/filebeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    RPM: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/filebeat/filebeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    WINDOWS: {
      title: 'Edit the configuration',
      textPre: 'Modify `C:\\Program Files\\Filebeat\\filebeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    }
  }
};

export function filebeatEnableInstructions(moduleName) {
  return {
    OSX: {
      title: 'Enable and configure the ' + moduleName + ' module',
      textPre: 'From the installation directory, run:',
      commands: [
        './filebeat modules enable ' + moduleName,
      ],
      textPost: 'Modify the settings in the `modules.d/' + moduleName + '.yml` file.'
    },
    DEB: {
      title: 'Enable and configure the ' + moduleName + ' module',
      commands: [
        'sudo filebeat modules enable ' + moduleName,
      ],
      textPost: 'Modify the settings in the `/etc/filebeat/modules.d/' + moduleName + '.yml` file.'
    },
    RPM: {
      title: 'Enable and configure the ' + moduleName + ' module',
      commands: [
        'sudo filebeat modules enable ' + moduleName,
      ],
      textPost: 'Modify the settings in the `/etc/filebeat/modules.d/' + moduleName + '.yml` file.'
    },
    WINDOWS: {
      title: 'Enable and configure the ' + moduleName + ' module',
      textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
      commands: [
        'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable ' + moduleName,
      ],
      textPost: 'Modify the settings in the `modules.d/' + moduleName + '.yml` file.'
    }
  };
}

export function filebeatStatusCheck(moduleName) {
  return {
    title: 'Module status',
    text: 'Check that data is received from the Filebeat `' + moduleName + '` module',
    btnLabel: 'Check data',
    success: 'Data successfully received from this module',
    error: 'No data has been received from this module yet',
    esHitsCheck: {
      index: 'filebeat-*',
      query: {
        bool: {
          filter: {
            term: {
              'fileset.module': moduleName
            }
          }
        }
      }
    }
  };
}

export function onPremInstructions(moduleName, platforms, geoipRequired, uaRequired) {
  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const instructions = [];
    if (geoipRequired && uaRequired) {
      instructions.push(FILEBEAT_INSTRUCTIONS.PLUGINS.GEOIP_AND_UA);
    } else if (geoipRequired) {
      instructions.push(FILEBEAT_INSTRUCTIONS.PLUGINS.GEOIP);
    }
    instructions.push(FILEBEAT_INSTRUCTIONS.INSTALL[platform]);
    instructions.push(FILEBEAT_INSTRUCTIONS.CONFIG[platform]);
    instructions.push(filebeatEnableInstructions(moduleName)[platform]);
    instructions.push(FILEBEAT_INSTRUCTIONS.START[platform]);
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: instructions
    });
  }
  return {
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: variants,
        statusCheck: filebeatStatusCheck(moduleName)
      }
    ]
  };
}

export function onPremCloudInstructions(moduleName, platforms) {
  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: [
        TRYCLOUD_OPTION1,
        TRYCLOUD_OPTION2,
        FILEBEAT_INSTRUCTIONS.INSTALL[platform],
        FILEBEAT_INSTRUCTIONS.CONFIG[platform],
        filebeatEnableInstructions(moduleName)[platform],
        FILEBEAT_INSTRUCTIONS.START[platform]
      ]
    });
  }

  return {
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: variants,
        statusCheck: filebeatStatusCheck(moduleName)
      }
    ]
  };
}

export function cloudInstructions(moduleName, platforms) {
  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: [
        FILEBEAT_INSTRUCTIONS.INSTALL[platform],
        FILEBEAT_CLOUD_INSTRUCTIONS.CONFIG[platform],
        filebeatEnableInstructions(moduleName)[platform],
        FILEBEAT_INSTRUCTIONS.START[platform]
      ]
    });
  }

  return {
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: variants,
        statusCheck: filebeatStatusCheck(moduleName)
      }
    ]
  };
}
