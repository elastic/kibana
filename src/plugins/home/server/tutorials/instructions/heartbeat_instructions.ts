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
import { INSTRUCTION_VARIANT } from '../../../common/instruction_variant';
import { createTrycloudOption1, createTrycloudOption2 } from './onprem_cloud_instructions';
import { getSpaceIdForBeatsTutorial } from './get_space_id_for_beats_tutorial';
import { Platform, TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
import { cloudPasswordAndResetLink } from './cloud_instructions';

export const createHeartbeatInstructions = (context?: TutorialContext) => ({
  INSTALL: {
    OSX: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.install.osxTitle', {
        defaultMessage: 'Download and install Heartbeat',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.install.osxTextPre', {
        defaultMessage: 'First time using Heartbeat? See the [Quick Start]({link}).',
        values: { link: '{config.docs.beats.heartbeat}/heartbeat-installation-configuration.html' },
      }),
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'tar xzvf heartbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'cd heartbeat-{config.kibana.version}-darwin-x86_64/',
      ],
    },
    DEB: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.install.debTitle', {
        defaultMessage: 'Download and install Heartbeat',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.install.debTextPre', {
        defaultMessage: 'First time using Heartbeat? See the [Quick Start]({link}).',
        values: { link: '{config.docs.beats.heartbeat}/heartbeat-installation-configuration.html' },
      }),
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-{config.kibana.version}-amd64.deb',
        'sudo dpkg -i heartbeat-{config.kibana.version}-amd64.deb',
      ],
      textPost: i18n.translate('home.tutorials.common.heartbeatInstructions.install.debTextPost', {
        defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({link}).',
        values: { link: 'https://www.elastic.co/downloads/beats/heartbeat' },
      }),
    },
    RPM: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.install.rpmTitle', {
        defaultMessage: 'Download and install Heartbeat',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.install.rpmTextPre', {
        defaultMessage: 'First time using Heartbeat? See the [Quick Start]({link}).',
        values: { link: '{config.docs.beats.heartbeat}/heartbeat-installation-configuration.html' },
      }),
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-{config.kibana.version}-x86_64.rpm',
        'sudo rpm -vi heartbeat-{config.kibana.version}-x86_64.rpm',
      ],
      textPost: i18n.translate('home.tutorials.common.heartbeatInstructions.install.debTextPost', {
        defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({link}).',
        values: { link: 'https://www.elastic.co/downloads/beats/heartbeat' },
      }),
    },
    WINDOWS: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.install.windowsTitle', {
        defaultMessage: 'Download and install Heartbeat',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatInstructions.install.windowsTextPre',
        {
          defaultMessage:
            'First time using Heartbeat? See the [Quick Start]({heartbeatLink}).\n\
 1. Download the Heartbeat Windows zip file from the [Download]({elasticLink}) page.\n\
 2. Extract the contents of the zip file into {folderPath}.\n\
 3. Rename the {directoryName} directory to `Heartbeat`.\n\
 4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select \
**Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n\
 5. From the PowerShell prompt, run the following commands to install Heartbeat as a Windows service.',
          values: {
            directoryName: '`heartbeat-{config.kibana.version}-windows`',
            folderPath: '`C:\\Program Files`',
            heartbeatLink:
              '{config.docs.beats.heartbeat}/heartbeat-installation-configuration.html',
            elasticLink: 'https://www.elastic.co/downloads/beats/heartbeat',
          },
        }
      ),
      commands: ['cd "C:\\Program Files\\Heartbeat"', '.\\install-service-heartbeat.ps1'],
    },
  },
  START: {
    OSX: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.start.osxTitle', {
        defaultMessage: 'Start Heartbeat',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.start.osxTextPre', {
        defaultMessage: 'The `setup` command loads the Kibana index pattern.',
      }),
      commands: ['./heartbeat setup', './heartbeat -e'],
    },
    DEB: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.start.debTitle', {
        defaultMessage: 'Start Heartbeat',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.start.debTextPre', {
        defaultMessage: 'The `setup` command loads the Kibana index pattern.',
      }),
      commands: ['sudo heartbeat setup', 'sudo service heartbeat-elastic start'],
    },
    RPM: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.start.rpmTitle', {
        defaultMessage: 'Start Heartbeat',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.start.rpmTextPre', {
        defaultMessage: 'The `setup` command loads the Kibana index pattern.',
      }),
      commands: ['sudo heartbeat setup', 'sudo service heartbeat-elastic start'],
    },
    WINDOWS: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.start.windowsTitle', {
        defaultMessage: 'Start Heartbeat',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.start.windowsTextPre', {
        defaultMessage: 'The `setup` command loads the Kibana index pattern.',
      }),
      commands: ['.\\heartbeat.exe setup', 'Start-Service heartbeat'],
    },
  },
  CONFIG: {
    OSX: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.config.osxTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.config.osxTextPre', {
        defaultMessage: 'Modify {path} to set the connection information:',
        values: {
          path: '`heartbeat.yml`',
        },
      }),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"',
        getSpaceIdForBeatsTutorial(context),
      ],
      textPost: i18n.translate('home.tutorials.common.heartbeatInstructions.config.osxTextPost', {
        defaultMessage:
          'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of Elasticsearch, \
and {kibanaUrlTemplate} is the URL of Kibana.',
        values: {
          passwordTemplate: '`<password>`',
          esUrlTemplate: '`<es_url>`',
          kibanaUrlTemplate: '`<kibana_url>`',
        },
      }),
    },
    DEB: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.config.debTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.config.debTextPre', {
        defaultMessage: 'Modify {path} to set the connection information:',
        values: {
          path: '`/etc/heartbeat/heartbeat.yml`',
        },
      }),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"',
        getSpaceIdForBeatsTutorial(context),
      ],
      textPost: i18n.translate('home.tutorials.common.heartbeatInstructions.config.debTextPost', {
        defaultMessage:
          'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of Elasticsearch, \
and {kibanaUrlTemplate} is the URL of Kibana.',
        values: {
          passwordTemplate: '`<password>`',
          esUrlTemplate: '`<es_url>`',
          kibanaUrlTemplate: '`<kibana_url>`',
        },
      }),
    },
    RPM: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.config.rpmTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.config.rpmTextPre', {
        defaultMessage: 'Modify {path} to set the connection information:',
        values: {
          path: '`/etc/heartbeat/heartbeat.yml`',
        },
      }),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"',
        getSpaceIdForBeatsTutorial(context),
      ],
      textPost: i18n.translate('home.tutorials.common.heartbeatInstructions.config.rpmTextPost', {
        defaultMessage:
          'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of Elasticsearch, \
and {kibanaUrlTemplate} is the URL of Kibana.',
        values: {
          passwordTemplate: '`<password>`',
          esUrlTemplate: '`<es_url>`',
          kibanaUrlTemplate: '`<kibana_url>`',
        },
      }),
    },
    WINDOWS: {
      title: i18n.translate('home.tutorials.common.heartbeatInstructions.config.windowsTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.config.windowsTextPre', {
        defaultMessage: 'Modify {path} to set the connection information:',
        values: {
          path: '`C:\\Program Files\\Heartbeat\\heartbeat.yml`',
        },
      }),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"',
        getSpaceIdForBeatsTutorial(context),
      ],
      textPost: i18n.translate(
        'home.tutorials.common.heartbeatInstructions.config.windowsTextPost',
        {
          defaultMessage:
            'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of Elasticsearch, \
and {kibanaUrlTemplate} is the URL of Kibana.',
          values: {
            passwordTemplate: '`<password>`',
            esUrlTemplate: '`<es_url>`',
            kibanaUrlTemplate: '`<kibana_url>`',
          },
        }
      ),
    },
  },
});

export const createHeartbeatCloudInstructions = () => ({
  CONFIG: {
    OSX: {
      title: i18n.translate('home.tutorials.common.heartbeatCloudInstructions.config.osxTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructions.config.osxTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`heartbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    DEB: {
      title: i18n.translate('home.tutorials.common.heartbeatCloudInstructions.config.debTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructions.config.debTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`/etc/heartbeat/heartbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    RPM: {
      title: i18n.translate('home.tutorials.common.heartbeatCloudInstructions.config.rpmTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructions.config.rpmTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`/etc/heartbeat/heartbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    WINDOWS: {
      title: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructions.config.windowsTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructions.config.windowsTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`C:\\Program Files\\Heartbeat\\heartbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
  },
});

export function heartbeatEnableInstructionsOnPrem() {
  const defaultTitle = i18n.translate(
    'home.tutorials.common.heartbeatEnableOnPremInstructions.defaultTitle',
    {
      defaultMessage: 'Edit the configuration - Add monitors',
    }
  );
  const defaultCommands = [
    'heartbeat.monitors:',
    '- type: http',
    '  urls: ["<http://localhost:9200>"]',
    '  schedule: "@every 10s"',
  ];
  const defaultTextPost = i18n.translate(
    'home.tutorials.common.heartbeatEnableOnPremInstructions.defaultTextPost',
    {
      defaultMessage:
        'Where {hostTemplate} is your monitored URL, For more details on how to configure Monitors in \
      Heartbeat, read the [Heartbeat configuration docs.]({configureLink})',
      values: {
        configureLink: '{config.docs.beats.heartbeat}/configuring-howto-heartbeat.html',
        hostTemplate: '`<http://localhost:9200>`',
      },
    }
  );
  return {
    OSX: {
      title: defaultTitle,
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatEnableOnPremInstructions.osxTextPre',
        {
          defaultMessage: 'Edit the `heartbeat.monitors` setting in the `heartbeat.yml` file.',
        }
      ),
      commands: defaultCommands,
      textPost: defaultTextPost,
    },
    DEB: {
      title: defaultTitle,
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatEnableOnPremInstructions.debTextPre',
        {
          defaultMessage: 'Edit the `heartbeat.monitors` setting in the `heartbeat.yml` file.',
        }
      ),
      commands: defaultCommands,
      textPost: defaultTextPost,
    },
    RPM: {
      title: defaultTitle,
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatEnableOnPremInstructions.rpmTextPre',
        {
          defaultMessage: 'Edit the `heartbeat.monitors` setting in the `heartbeat.yml` file.',
        }
      ),
      commands: defaultCommands,
      textPost: defaultTextPost,
    },
    WINDOWS: {
      title: defaultTitle,
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatEnableOnPremInstructions.windowsTextPre',
        {
          defaultMessage: 'Edit the `heartbeat.monitors` setting in the `heartbeat.yml` file.',
        }
      ),
      commands: defaultCommands,
      textPost: defaultTextPost,
    },
  };
}

export function heartbeatEnableInstructionsCloud() {
  const defaultTitle = i18n.translate(
    'home.tutorials.common.heartbeatEnableCloudInstructions.defaultTitle',
    {
      defaultMessage: 'Edit the configuration - Add monitors',
    }
  );
  const defaultCommands = [
    'heartbeat.monitors:',
    '- type: http',
    '  urls: ["http://elastic.co"]',
    '  schedule: "@every 10s"',
  ];
  const defaultTextPost = i18n.translate(
    'home.tutorials.common.heartbeatEnableCloudInstructions.defaultTextPost',
    {
      defaultMessage:
        'For more details on how to configure Monitors in Heartbeat, read the [Heartbeat configuration docs.]({configureLink})',
      values: { configureLink: '{config.docs.beats.heartbeat}/configuring-howto-heartbeat.html' },
    }
  );
  return {
    OSX: {
      title: defaultTitle,
      textPre: i18n.translate('home.tutorials.common.heartbeatEnableCloudInstructions.osxTextPre', {
        defaultMessage: 'Edit the `heartbeat.monitors` setting in the `heartbeat.yml` file.',
      }),
      commands: defaultCommands,
      textPost: defaultTextPost,
    },
    DEB: {
      title: defaultTitle,
      textPre: i18n.translate('home.tutorials.common.heartbeatEnableCloudInstructions.debTextPre', {
        defaultMessage: 'Edit the `heartbeat.monitors` setting in the `heartbeat.yml` file.',
      }),
      commands: defaultCommands,
      textPost: defaultTextPost,
    },
    RPM: {
      title: defaultTitle,
      textPre: i18n.translate('home.tutorials.common.heartbeatEnableCloudInstructions.rpmTextPre', {
        defaultMessage: 'Edit the `heartbeat.monitors` setting in the `heartbeat.yml` file.',
      }),
      commands: defaultCommands,
      textPost: defaultTextPost,
    },
    WINDOWS: {
      title: defaultTitle,
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatEnableCloudInstructions.windowsTextPre',
        {
          defaultMessage: 'Edit the `heartbeat.monitors` setting in the `heartbeat.yml` file.',
        }
      ),
      commands: defaultCommands,
      textPost: defaultTextPost,
    },
  };
}

export function heartbeatStatusCheck() {
  return {
    title: i18n.translate('home.tutorials.common.heartbeatStatusCheck.title', {
      defaultMessage: 'Heartbeat status',
    }),
    text: i18n.translate('home.tutorials.common.heartbeatStatusCheck.text', {
      defaultMessage: 'Check that data is received from Heartbeat',
    }),
    btnLabel: i18n.translate('home.tutorials.common.heartbeatStatusCheck.buttonLabel', {
      defaultMessage: 'Check data',
    }),
    success: i18n.translate('home.tutorials.common.heartbeatStatusCheck.successText', {
      defaultMessage: 'Data successfully received from Heartbeat',
    }),
    error: i18n.translate('home.tutorials.common.heartbeatStatusCheck.errorText', {
      defaultMessage: 'No data has been received from Heartbeat yet',
    }),
    esHitsCheck: {
      index: 'heartbeat-*',
      query: {
        match_all: {},
      },
    },
  };
}

export function onPremInstructions(platforms: Platform[], context?: TutorialContext) {
  const HEARTBEAT_INSTRUCTIONS = createHeartbeatInstructions(context);

  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.heartbeat.premInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              HEARTBEAT_INSTRUCTIONS.INSTALL.OSX,
              HEARTBEAT_INSTRUCTIONS.CONFIG.OSX,
              heartbeatEnableInstructionsOnPrem().OSX,
              HEARTBEAT_INSTRUCTIONS.START.OSX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              HEARTBEAT_INSTRUCTIONS.INSTALL.DEB,
              HEARTBEAT_INSTRUCTIONS.CONFIG.DEB,
              heartbeatEnableInstructionsOnPrem().DEB,
              HEARTBEAT_INSTRUCTIONS.START.DEB,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              HEARTBEAT_INSTRUCTIONS.INSTALL.RPM,
              HEARTBEAT_INSTRUCTIONS.CONFIG.RPM,
              heartbeatEnableInstructionsOnPrem().RPM,
              HEARTBEAT_INSTRUCTIONS.START.RPM,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              HEARTBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              HEARTBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              heartbeatEnableInstructionsOnPrem().WINDOWS,
              HEARTBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: heartbeatStatusCheck(),
      },
    ],
  };
}

export function onPremCloudInstructions() {
  const TRYCLOUD_OPTION1 = createTrycloudOption1();
  const TRYCLOUD_OPTION2 = createTrycloudOption2();
  const HEARTBEAT_INSTRUCTIONS = createHeartbeatInstructions();

  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.heartbeat.premCloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              HEARTBEAT_INSTRUCTIONS.INSTALL.OSX,
              HEARTBEAT_INSTRUCTIONS.CONFIG.OSX,
              heartbeatEnableInstructionsCloud().OSX,
              HEARTBEAT_INSTRUCTIONS.START.OSX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              HEARTBEAT_INSTRUCTIONS.INSTALL.DEB,
              HEARTBEAT_INSTRUCTIONS.CONFIG.DEB,
              heartbeatEnableInstructionsCloud().DEB,
              HEARTBEAT_INSTRUCTIONS.START.DEB,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              HEARTBEAT_INSTRUCTIONS.INSTALL.RPM,
              HEARTBEAT_INSTRUCTIONS.CONFIG.RPM,
              heartbeatEnableInstructionsCloud().RPM,
              HEARTBEAT_INSTRUCTIONS.START.RPM,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              HEARTBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              HEARTBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              heartbeatEnableInstructionsCloud().WINDOWS,
              HEARTBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: heartbeatStatusCheck(),
      },
    ],
  };
}

export function cloudInstructions() {
  const HEARTBEAT_INSTRUCTIONS = createHeartbeatInstructions();
  const HEARTBEAT_CLOUD_INSTRUCTIONS = createHeartbeatCloudInstructions();

  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.heartbeat.cloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              HEARTBEAT_INSTRUCTIONS.INSTALL.OSX,
              HEARTBEAT_CLOUD_INSTRUCTIONS.CONFIG.OSX,
              heartbeatEnableInstructionsCloud().OSX,
              HEARTBEAT_INSTRUCTIONS.START.OSX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              HEARTBEAT_INSTRUCTIONS.INSTALL.DEB,
              HEARTBEAT_CLOUD_INSTRUCTIONS.CONFIG.DEB,
              heartbeatEnableInstructionsCloud().DEB,
              HEARTBEAT_INSTRUCTIONS.START.DEB,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              HEARTBEAT_INSTRUCTIONS.INSTALL.RPM,
              HEARTBEAT_CLOUD_INSTRUCTIONS.CONFIG.RPM,
              heartbeatEnableInstructionsCloud().RPM,
              HEARTBEAT_INSTRUCTIONS.START.RPM,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              HEARTBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              HEARTBEAT_CLOUD_INSTRUCTIONS.CONFIG.WINDOWS,
              heartbeatEnableInstructionsCloud().WINDOWS,
              HEARTBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: heartbeatStatusCheck(),
      },
    ],
  };
}
