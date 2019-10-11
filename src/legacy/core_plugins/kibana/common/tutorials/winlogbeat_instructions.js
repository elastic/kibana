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

export const createWinlogbeatInstructions = context => ({
  INSTALL: {
    WINDOWS: {
      title: i18n.translate('kbn.common.tutorials.winlogbeatInstructions.install.windowsTitle', {
        defaultMessage: 'Download and install Winlogbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.winlogbeatInstructions.install.windowsTextPre', {
        defaultMessage: 'First time using Winlogbeat? See the [Getting Started Guide]({winlogbeatLink}).\n\
 1. Download the Winlogbeat Windows zip file from the [Download]({elasticLink}) page.\n\
 2. Extract the contents of the zip file into {folderPath}.\n\
 3. Rename the {directoryName} directory to `Winlogbeat`.\n\
 4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select \
**Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n\
 5. From the PowerShell prompt, run the following commands to install Winlogbeat as a Windows service.',
        values: {
          directoryName: '`winlogbeat-{config.kibana.version}-windows`',
          folderPath: '`C:\\Program Files`',
          winlogbeatLink: '{config.docs.beats.winlogbeat}/winlogbeat-getting-started.html',
          elasticLink: 'https://www.elastic.co/downloads/beats/winlogbeat',
        },
      }),
      commands: [
        'cd "C:\\Program Files\\Winlogbeat"',
        '.\\install-service-winlogbeat.ps1',
      ],
      textPost: i18n.translate('kbn.common.tutorials.winlogbeatInstructions.install.windowsTextPost', {
        defaultMessage: 'Modify the settings under `output.elasticsearch` in the {path} file to point to your Elasticsearch installation.',
        values: { path: '`C:\\Program Files\\Winlogbeat\\winlogbeat.yml`' },
      }),
    }
  },
  START: {
    WINDOWS: {
      title: i18n.translate('kbn.common.tutorials.winlogbeatInstructions.start.windowsTitle', {
        defaultMessage: 'Start Winlogbeat',
      }),
      textPre: i18n.translate('kbn.common.tutorials.winlogbeatInstructions.start.windowsTextPre', {
        defaultMessage: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
      }),
      commands: [
        '.\\winlogbeat.exe setup',
        'Start-Service winlogbeat',
      ],
    },
  },
  CONFIG: {
    WINDOWS: {
      title: i18n.translate('kbn.common.tutorials.winlogbeatInstructions.config.windowsTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.winlogbeatInstructions.config.windowsTextPre', {
        defaultMessage: 'Modify {path} to set the connection information:',
        values: {
          path: '`C:\\Program Files\\Winlogbeat\\winlogbeat.yml`',
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
      textPost: i18n.translate('kbn.common.tutorials.winlogbeatInstructions.config.windowsTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of Elasticsearch, \
and {kibanaUrlTemplate} is the URL of Kibana.',
        values: {
          passwordTemplate: '`<password>`',
          esUrlTemplate: '`<es_url>`',
          kibanaUrlTemplate: '`<kibana_url>`',
        },
      }),
    }
  }
});

export const createWinlogbeatCloudInstructions = () => ({
  CONFIG: {
    WINDOWS: {
      title: i18n.translate('kbn.common.tutorials.winlogbeatCloudInstructions.config.windowsTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('kbn.common.tutorials.winlogbeatCloudInstructions.config.windowsTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`C:\\Program Files\\Winlogbeat\\winlogbeat.yml`',
        },
      }),
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: i18n.translate('kbn.common.tutorials.winlogbeatCloudInstructions.config.windowsTextPost', {
        defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user.',
        values: { passwordTemplate: '`<password>`' },
      }),
    }
  }
});

export function winlogbeatStatusCheck() {
  return {
    title: i18n.translate('kbn.common.tutorials.winlogbeatStatusCheck.title', {
      defaultMessage: 'Module status',
    }),
    text: i18n.translate('kbn.common.tutorials.winlogbeatStatusCheck.text', {
      defaultMessage: 'Check that data is received from Winlogbeat',
    }),
    btnLabel: i18n.translate('kbn.common.tutorials.winlogbeatStatusCheck.buttonLabel', {
      defaultMessage: 'Check data',
    }),
    success: i18n.translate('kbn.common.tutorials.winlogbeatStatusCheck.successText', {
      defaultMessage: 'Data successfully received',
    }),
    error: i18n.translate('kbn.common.tutorials.winlogbeatStatusCheck.errorText', {
      defaultMessage: 'No data has been received yet',
    }),
    esHitsCheck: {
      index: 'winlogbeat-*',
      query: {
        bool: {
          filter: {
            term: {
              'agent.type': 'winlogbeat',
            },
          },
        },
      },
    },
  };
}

export function onPremInstructions(platforms, context) {
  const WINLOGBEAT_INSTRUCTIONS = createWinlogbeatInstructions(context);

  return {
    instructionSets: [
      {
        title: i18n.translate('kbn.common.tutorials.winlogbeat.premInstructions.gettingStarted.title', {
          defaultMessage: 'Getting Started',
        }),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              WINLOGBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              WINLOGBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              WINLOGBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: winlogbeatStatusCheck(),
      },
    ],
  };
}

export function onPremCloudInstructions() {
  const TRYCLOUD_OPTION1 = createTrycloudOption1();
  const TRYCLOUD_OPTION2 = createTrycloudOption2();
  const WINLOGBEAT_INSTRUCTIONS = createWinlogbeatInstructions();

  return {
    instructionSets: [
      {
        title: i18n.translate('kbn.common.tutorials.winlogbeat.premCloudInstructions.gettingStarted.title', {
          defaultMessage: 'Getting Started',
        }),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              WINLOGBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              WINLOGBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              WINLOGBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: winlogbeatStatusCheck(),
      },
    ],
  };
}

export function cloudInstructions() {
  const WINLOGBEAT_INSTRUCTIONS = createWinlogbeatInstructions();
  const WINLOGBEAT_CLOUD_INSTRUCTIONS = createWinlogbeatCloudInstructions();

  return {
    instructionSets: [
      {
        title: i18n.translate('kbn.common.tutorials.winlogbeat.cloudInstructions.gettingStarted.title', {
          defaultMessage: 'Getting Started',
        }),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              WINLOGBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              WINLOGBEAT_CLOUD_INSTRUCTIONS.CONFIG.WINDOWS,
              WINLOGBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: winlogbeatStatusCheck(),
      },
    ],
  };
}
