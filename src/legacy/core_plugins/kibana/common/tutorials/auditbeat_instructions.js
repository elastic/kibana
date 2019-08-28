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

import { i18n } from '@kbn/i18n';
import { INSTRUCTION_VARIANT } from './instruction_variant';
import { createTrycloudOption1, createTrycloudOption2 } from './onprem_cloud_instructions';
import { getSpaceIdForBeatsTutorial } from '../lib/get_space_id_for_beats_tutorial';

export const createAuditbeatInstructions = context => ({
  INSTALL: {
    OSX: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.osxTitle', {
        defaultMessage: 'Download and install Auditbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.osxTextPre', {
        defaultMessage: 'First time using Auditbeat? See the [Getting Started Guide]({linkUrl}).',
        values: {
          linkUrl: '{config.docs.beats.auditbeat}/auditbeat-getting-started.html',
        },
      }),
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'tar xzvf auditbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'cd auditbeat-{config.kibana.version}-darwin-x86_64/',
      ],
    },
    DEB: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.debTitle', {
        defaultMessage: 'Download and install Auditbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.debTextPre', {
        defaultMessage: 'First time using Auditbeat? See the [Getting Started Guide]({linkUrl}).',
        values: {
          linkUrl: '{config.docs.beats.auditbeat}/auditbeat-getting-started.html',
        },
      }),
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-{config.kibana.version}-amd64.deb',
        'sudo dpkg -i auditbeat-{config.kibana.version}-amd64.deb',
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.debTextPost', {
        defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({linkUrl}).',
        values: {
          linkUrl: 'https://www.elastic.co/downloads/beats/auditbeat',
        },
      }),
    },
    RPM: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.rpmTitle', {
        defaultMessage: 'Download and install Auditbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.rpmTextPre', {
        defaultMessage: 'First time using Auditbeat? See the [Getting Started Guide]({linkUrl}).',
        values: {
          linkUrl: '{config.docs.beats.auditbeat}/auditbeat-getting-started.html',
        },
      }),
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-{config.kibana.version}-x86_64.rpm',
        'sudo rpm -vi auditbeat-{config.kibana.version}-x86_64.rpm',
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.rpmTextPost', {
        defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({linkUrl}).',
        values: {
          linkUrl: 'https://www.elastic.co/downloads/beats/auditbeat',
        },
      }),
    },
    WINDOWS: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.windowsTitle', {
        defaultMessage: 'Download and install Auditbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.windowsTextPre', {
        defaultMessage: 'First time using Auditbeat? See the [Getting Started Guide]({guideLinkUrl}).\n\
 1. Download the Auditbeat Windows zip file from the [Download]({auditbeatLinkUrl}) page.\n\
 2. Extract the contents of the zip file into {folderPath}.\n\
 3. Rename the `{directoryName}` directory to `Auditbeat`.\n\
 4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select \
**Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n\
 5. From the PowerShell prompt, run the following commands to install Auditbeat as a Windows service.',
        values: {
          folderPath: '`C:\\Program Files`',
          guideLinkUrl: '{config.docs.beats.auditbeat}/auditbeat-getting-started.html',
          auditbeatLinkUrl: 'https://www.elastic.co/downloads/beats/auditbeat',
          directoryName: 'auditbeat-{config.kibana.version}-windows',
        }
      }),
      commands: [
        'cd "C:\\Program Files\\Auditbeat"',
        '.\\install-service-auditbeat.ps1',
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatInstructions.install.windowsTextPost', {
        defaultMessage: 'Modify the settings under {propertyName} in the {auditbeatPath} file to point to your Elasticsearch installation.',
        values: {
          propertyName: '`output.elasticsearch`',
          auditbeatPath: '`C:\\Program Files\\Auditbeat\\auditbeat.yml`',
        }
      }),
    }
  },
  START: {
    OSX: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.start.osxTitle', {
        defaultMessage: 'Start Auditbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.start.osxTextPre', {
        defaultMessage: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
      }),
      commands: [
        './auditbeat setup',
        './auditbeat -e',
      ]
    },
    DEB: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.start.debTitle', {
        defaultMessage: 'Start Auditbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.start.debTextPre', {
        defaultMessage: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
      }),
      commands: [
        'sudo auditbeat setup',
        'sudo service auditbeat start',
      ]
    },
    RPM: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.start.rpmTitle', {
        defaultMessage: 'Start Auditbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.start.rpmTextPre', {
        defaultMessage: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
      }),
      commands: [
        'sudo auditbeat setup',
        'sudo service auditbeat start',
      ],
    },
    WINDOWS: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.start.windowsTitle', {
        defaultMessage: 'Start Auditbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.start.windowsTextPre', {
        defaultMessage: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
      }),
      commands: [
        '.\\auditbeat.exe setup',
        'Start-Service auditbeat',
      ],
    },
  },
  CONFIG: {
    OSX: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.osxTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.osxTextPre', {
        defaultMessage: 'Modify {path} to set the connection information:',
        values: {
          path: '`auditbeat.yml`',
        },
      }),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"',
        getSpaceIdForBeatsTutorial(context)
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.osxTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of Elasticsearch, \
and {kibanaUrlTemplate} is the URL of Kibana.',
        values: {
          passwordTemplate: '`<password>`',
          esUrlTemplate: '`<es_url>`',
          kibanaUrlTemplate: '`<kibana_url>`',
        },
      }),
    },
    DEB: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.debTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.debTextPre', {
        defaultMessage: 'Modify {path} to set the connection information:',
        values: {
          path: '`/etc/auditbeat/auditbeat.yml`',
        },
      }),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"',
        getSpaceIdForBeatsTutorial(context)
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.debTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of Elasticsearch, \
and {kibanaUrlTemplate} is the URL of Kibana.',
        values: {
          passwordTemplate: '`<password>`',
          esUrlTemplate: '`<es_url>`',
          kibanaUrlTemplate: '`<kibana_url>`',
        },
      }),
    },
    RPM: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.rpmTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.rpmTextPre', {
        defaultMessage: 'Modify {path} to set the connection information:',
        values: {
          path: '`/etc/auditbeat/auditbeat.yml`',
        },
      }),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"',
        getSpaceIdForBeatsTutorial(context)
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.rpmTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of Elasticsearch, \
and {kibanaUrlTemplate} is the URL of Kibana.',
        values: {
          passwordTemplate: '`<password>`',
          esUrlTemplate: '`<es_url>`',
          kibanaUrlTemplate: '`<kibana_url>`',
        },
      }),
    },
    WINDOWS: {
      title: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.windowsTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.windowsTextPre', {
        defaultMessage: 'Modify {path} to set the connection information:',
        values: {
          path: '`C:\\Program Files\\Auditbeat\\auditbeat.yml`',
        },
      }),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"',
        getSpaceIdForBeatsTutorial(context)
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatInstructions.config.windowsTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of Elasticsearch, \
and {kibanaUrlTemplate} is the URL of Kibana.',
        values: {
          passwordTemplate: '`<password>`',
          esUrlTemplate: '`<es_url>`',
          kibanaUrlTemplate: '`<kibana_url>`',
        },
      }),
    }
  },
});

export const createAuditbeatCloudInstructions = () => ({
  CONFIG: {
    OSX: {
      title: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.osxTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.osxTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`auditbeat.yml`',
        },
      }),
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.osxTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user.',
        values: { passwordTemplate: '`<password>`' },
      }),
    },
    DEB: {
      title: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.debTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.debTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`/etc/auditbeat/auditbeat.yml`',
        },
      }),
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.debTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user.',
        values: { passwordTemplate: '`<password>`' },
      }),
    },
    RPM: {
      title: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.rpmTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.rpmTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`/etc/auditbeat/auditbeat.yml`',
        },
      }),
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.rpmTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user.',
        values: { passwordTemplate: '`<password>`' },
      }),
    },
    WINDOWS: {
      title: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.windowsTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.windowsTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`C:\\Program Files\\Auditbeat\\auditbeat.yml`',
        },
      }),
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: i18n.translate('kbn.common.tutorials.auditbeatCloudInstructions.config.windowsTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user.',
        values: { passwordTemplate: '`<password>`' },
      }),
    }
  }
});

export function auditbeatStatusCheck() {
  return {
    title: i18n.translate('kbn.common.tutorials.auditbeatStatusCheck.title', {
      defaultMessage: 'Status',
    }),
    text: i18n.translate('kbn.common.tutorials.auditbeatStatusCheck.text', {
      defaultMessage: 'Check that data is received from Auditbeat',
    }),
    btnLabel: i18n.translate('kbn.common.tutorials.auditbeatStatusCheck.buttonLabel', {
      defaultMessage: 'Check data',
    }),
    success: i18n.translate('kbn.common.tutorials.auditbeatStatusCheck.successText', {
      defaultMessage: 'Data successfully received',
    }),
    error: i18n.translate('kbn.common.tutorials.auditbeatStatusCheck.errorText', {
      defaultMessage: 'No data has been received yet',
    }),
    esHitsCheck: {
      index: 'auditbeat-*',
      query: {
        bool: {
          filter: {
            term: {
              'agent.type': 'auditbeat',
            },
          },
        },
      },
    },
  };
}

export function onPremInstructions(platforms, context) {
  const AUDITBEAT_INSTRUCTIONS = createAuditbeatInstructions(context);

  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const instructions = [];
    instructions.push(AUDITBEAT_INSTRUCTIONS.INSTALL[platform]);
    instructions.push(AUDITBEAT_INSTRUCTIONS.CONFIG[platform]);
    instructions.push(AUDITBEAT_INSTRUCTIONS.START[platform]);
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: instructions,
    });
  }
  return {
    instructionSets: [
      {
        title: i18n.translate('kbn.common.tutorials.auditbeat.premInstructions.gettingStarted.title', {
          defaultMessage: 'Getting Started',
        }),
        instructionVariants: variants,
        statusCheck: auditbeatStatusCheck(),
      },
    ],
  };
}

export function onPremCloudInstructions(platforms) {
  const AUDITBEAT_INSTRUCTIONS = createAuditbeatInstructions();
  const TRYCLOUD_OPTION1 = createTrycloudOption1();
  const TRYCLOUD_OPTION2 = createTrycloudOption2();

  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: [
        TRYCLOUD_OPTION1,
        TRYCLOUD_OPTION2,
        AUDITBEAT_INSTRUCTIONS.INSTALL[platform],
        AUDITBEAT_INSTRUCTIONS.CONFIG[platform],
        AUDITBEAT_INSTRUCTIONS.START[platform],
      ],
    });
  }

  return {
    instructionSets: [
      {
        title: i18n.translate('kbn.common.tutorials.auditbeat.premCloudInstructions.gettingStarted.title', {
          defaultMessage: 'Getting Started',
        }),
        instructionVariants: variants,
        statusCheck: auditbeatStatusCheck(),
      },
    ],
  };
}

export function cloudInstructions(platforms) {
  const AUDITBEAT_INSTRUCTIONS = createAuditbeatInstructions();
  const AUDITBEAT_CLOUD_INSTRUCTIONS = createAuditbeatCloudInstructions();

  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: [
        AUDITBEAT_INSTRUCTIONS.INSTALL[platform],
        AUDITBEAT_CLOUD_INSTRUCTIONS.CONFIG[platform],
        AUDITBEAT_INSTRUCTIONS.START[platform],
      ],
    });
  }

  return {
    instructionSets: [
      {
        title: i18n.translate('kbn.common.tutorials.auditbeat.cloudInstructions.gettingStarted.title', {
          defaultMessage: 'Getting Started',
        }),
        instructionVariants: variants,
        statusCheck: auditbeatStatusCheck(),
      },
    ],
  };
}
