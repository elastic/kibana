/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { INSTRUCTION_VARIANT } from '../../../common/instruction_variant';
import { createTrycloudOption1, createTrycloudOption2 } from './onprem_cloud_instructions';
import { getSpaceIdForBeatsTutorial } from './get_space_id_for_beats_tutorial';
import type {
  Platform,
  TutorialContext,
} from '../../services/tutorials/lib/tutorials_registry_types';
import { cloudPasswordAndResetLink, cloudServerlessApiKeyNote } from './cloud_instructions';

export const createHeartbeatInstructions = (context: TutorialContext) => {
  const SSL_DOC_URL = `https://www.elastic.co/guide/en/beats/heartbeat/${context.kibanaBranch}/configuration-ssl.html#ca-sha256`;

  return {
    INSTALL: {
      OSX: {
        title: i18n.translate('home.tutorials.common.heartbeatInstructions.install.osxTitle', {
          defaultMessage: 'Download and install Heartbeat',
        }),
        textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.install.osxTextPre', {
          defaultMessage: 'First time using Heartbeat? See the [Quick Start]({link}).',
          values: {
            link: '{config.docs.beats.heartbeat}/heartbeat-installation-configuration.html',
          },
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
          values: {
            link: '{config.docs.beats.heartbeat}/heartbeat-installation-configuration.html',
          },
        }),
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-{config.kibana.version}-amd64.deb',
          'sudo dpkg -i heartbeat-{config.kibana.version}-amd64.deb',
        ],
        textPost: i18n.translate(
          'home.tutorials.common.heartbeatInstructions.install.debTextPost',
          {
            defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({link}).',
            values: { link: 'https://www.elastic.co/downloads/beats/heartbeat' },
          }
        ),
      },
      RPM: {
        title: i18n.translate('home.tutorials.common.heartbeatInstructions.install.rpmTitle', {
          defaultMessage: 'Download and install Heartbeat',
        }),
        textPre: i18n.translate('home.tutorials.common.heartbeatInstructions.install.rpmTextPre', {
          defaultMessage: 'First time using Heartbeat? See the [Quick Start]({link}).',
          values: {
            link: '{config.docs.beats.heartbeat}/heartbeat-installation-configuration.html',
          },
        }),
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/beats/heartbeat/heartbeat-{config.kibana.version}-x86_64.rpm',
          'sudo rpm -vi heartbeat-{config.kibana.version}-x86_64.rpm',
        ],
        textPost: i18n.translate(
          'home.tutorials.common.heartbeatInstructions.install.rpmTextPost',
          {
            defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({link}).',
            values: { link: 'https://www.elastic.co/downloads/beats/heartbeat' },
          }
        ),
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
        textPre: i18n.translate(
          'home.tutorials.common.heartbeatInstructions.start.windowsTextPre',
          {
            defaultMessage: 'The `setup` command loads the Kibana index pattern.',
          }
        ),
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
          "  # If using Elasticsearch's default certificate",
          '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"',
          'setup.kibana:',
          '  host: "<kibana_url>"',
          getSpaceIdForBeatsTutorial(context),
        ],
        textPost: i18n.translate(
          'home.tutorials.common.heartbeatInstructions.config.osxTextPostMarkdown',
          {
            defaultMessage:
              'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
            Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
            default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.\n\n\
> **_Important:_**  Do not use the built-in `elastic` user to secure clients in a production environment. Instead set up \
authorized users or API keys, and do not expose passwords in configuration files. [Learn more]({linkUrl}).',
            values: {
              passwordTemplate: '`<password>`',
              esUrlTemplate: '`<es_url>`',
              kibanaUrlTemplate: '`<kibana_url>`',
              configureSslUrl: SSL_DOC_URL,
              esCertFingerprintTemplate: '`<es cert fingerprint>`',
              linkUrl: '{config.docs.beats.heartbeat}/securing-heartbeat.html',
            },
          }
        ),
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
          "  # If using Elasticsearch's default certificate",
          '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"',
          'setup.kibana:',
          '  host: "<kibana_url>"',
          getSpaceIdForBeatsTutorial(context),
        ],
        textPost: i18n.translate(
          'home.tutorials.common.heartbeatInstructions.config.debTextPostMarkdown',
          {
            defaultMessage:
              'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
            Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
            default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.\n\n\
> **_Important:_**  Do not use the built-in `elastic` user to secure clients in a production environment. Instead set up \
authorized users or API keys, and do not expose passwords in configuration files. [Learn more]({linkUrl}).',
            values: {
              passwordTemplate: '`<password>`',
              esUrlTemplate: '`<es_url>`',
              kibanaUrlTemplate: '`<kibana_url>`',
              configureSslUrl: SSL_DOC_URL,
              esCertFingerprintTemplate: '`<es cert fingerprint>`',
              linkUrl: '{config.docs.beats.heartbeat}/securing-heartbeat.html',
            },
          }
        ),
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
          "  # If using Elasticsearch's default certificate",
          '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"',
          'setup.kibana:',
          '  host: "<kibana_url>"',
          getSpaceIdForBeatsTutorial(context),
        ],
        textPost: i18n.translate(
          'home.tutorials.common.heartbeatInstructions.config.rpmTextPostMarkdown',
          {
            defaultMessage:
              'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
            Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
            default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.\n\n\
> **_Important:_**  Do not use the built-in `elastic` user to secure clients in a production environment. Instead set up \
authorized users or API keys, and do not expose passwords in configuration files. [Learn more]({linkUrl}).',
            values: {
              passwordTemplate: '`<password>`',
              esUrlTemplate: '`<es_url>`',
              kibanaUrlTemplate: '`<kibana_url>`',
              configureSslUrl: SSL_DOC_URL,
              esCertFingerprintTemplate: '`<es cert fingerprint>`',
              linkUrl: '{config.docs.beats.heartbeat}/securing-heartbeat.html',
            },
          }
        ),
      },
      WINDOWS: {
        title: i18n.translate('home.tutorials.common.heartbeatInstructions.config.windowsTitle', {
          defaultMessage: 'Edit the configuration',
        }),
        textPre: i18n.translate(
          'home.tutorials.common.heartbeatInstructions.config.windowsTextPre',
          {
            defaultMessage: 'Modify {path} to set the connection information:',
            values: {
              path: '`C:\\Program Files\\Heartbeat\\heartbeat.yml`',
            },
          }
        ),
        commands: [
          'output.elasticsearch:',
          '  hosts: ["<es_url>"]',
          '  username: "elastic"',
          '  password: "<password>"',
          "  # If using Elasticsearch's default certificate",
          '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"',
          'setup.kibana:',
          '  host: "<kibana_url>"',
          getSpaceIdForBeatsTutorial(context),
        ],
        textPost: i18n.translate(
          'home.tutorials.common.heartbeatInstructions.config.windowsTextPostMarkdown',
          {
            defaultMessage:
              'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
              Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
              default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.\n\n\
  > **_Important:_**  Do not use the built-in `elastic` user to secure clients in a production environment. Instead set up \
  authorized users or API keys, and do not expose passwords in configuration files. [Learn more]({linkUrl}).',
            values: {
              passwordTemplate: '`<password>`',
              esUrlTemplate: '`<es_url>`',
              kibanaUrlTemplate: '`<kibana_url>`',
              configureSslUrl: SSL_DOC_URL,
              esCertFingerprintTemplate: '`<es cert fingerprint>`',
              linkUrl: '{config.docs.beats.heartbeat}/securing-heartbeat.html',
            },
          }
        ),
      },
    },
  };
};

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

export const createHeartbeatCloudInstructionsServerless = () => ({
  CONFIG: {
    OSX: {
      title: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructionsServerless.config.osxTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructionsServerless.config.osxTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`heartbeat.yml`',
          },
        }
      ),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<elasticsearch_endpoint_url>"]',
        '  api_key: "<your_api_key>"',
      ],
      textPost: cloudServerlessApiKeyNote,
    },
    DEB: {
      title: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructionsServerless.config.debTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructionsServerless.config.debTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`/etc/heartbeat/heartbeat.yml`',
          },
        }
      ),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<elasticsearch_endpoint_url>"]',
        '  api_key: "<your_api_key>"',
      ],
      textPost: cloudServerlessApiKeyNote,
    },
    RPM: {
      title: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructionsServerless.config.rpmTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructionsServerless.config.rpmTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`/etc/heartbeat/heartbeat.yml`',
          },
        }
      ),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<elasticsearch_endpoint_url>"]',
        '  api_key: "<your_api_key>"',
      ],
      textPost: cloudServerlessApiKeyNote,
    },
    WINDOWS: {
      title: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructionsServerless.config.windowsTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.heartbeatCloudInstructionsServerless.config.windowsTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`C:\\Program Files\\Heartbeat\\heartbeat.yml`',
          },
        }
      ),
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<elasticsearch_endpoint_url>"]',
        '  api_key: "<your_api_key>"',
      ],
      textPost: cloudServerlessApiKeyNote,
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

export function onPremInstructions(platforms: Platform[], context: TutorialContext) {
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

export function onPremCloudInstructions(context: TutorialContext) {
  const TRYCLOUD_OPTION1 = createTrycloudOption1();
  const TRYCLOUD_OPTION2 = createTrycloudOption2();
  const HEARTBEAT_INSTRUCTIONS = createHeartbeatInstructions(context);

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

export function cloudInstructions(context: TutorialContext) {
  const HEARTBEAT_INSTRUCTIONS = createHeartbeatInstructions(context);
  const HEARTBEAT_CLOUD_INSTRUCTIONS = context.isServerless
    ? createHeartbeatCloudInstructionsServerless()
    : createHeartbeatCloudInstructions();

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
