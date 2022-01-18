/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { INSTRUCTION_VARIANT } from '../../../common/instruction_variant';
import { createTrycloudOption1, createTrycloudOption2 } from './onprem_cloud_instructions';
import { getSpaceIdForBeatsTutorial } from './get_space_id_for_beats_tutorial';
import { Platform, TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
import { cloudPasswordAndResetLink } from './cloud_instructions';

export const createAuditbeatInstructions = (context: TutorialContext) => {
  const SSL_DOC_URL = `https://www.elastic.co/guide/en/beats/auditbeat/${context.kibanaBranch}/configuration-ssl.html#ca-sha256`;

  return {
    INSTALL: {
      OSX: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.install.osxTitle', {
          defaultMessage: 'Download and install Auditbeat',
        }),
        textPre: i18n.translate('home.tutorials.common.auditbeatInstructions.install.osxTextPre', {
          defaultMessage: 'First time using Auditbeat? See the [Quick Start]({linkUrl}).',
          values: {
            linkUrl: '{config.docs.beats.auditbeat}/auditbeat-installation-configuration.html',
          },
        }),
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
          'tar xzvf auditbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
          'cd auditbeat-{config.kibana.version}-darwin-x86_64/',
        ],
      },
      DEB: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.install.debTitle', {
          defaultMessage: 'Download and install Auditbeat',
        }),
        textPre: i18n.translate('home.tutorials.common.auditbeatInstructions.install.debTextPre', {
          defaultMessage: 'First time using Auditbeat? See the [Quick Start]({linkUrl}).',
          values: {
            linkUrl: '{config.docs.beats.auditbeat}/auditbeat-installation-configuration.html',
          },
        }),
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-{config.kibana.version}-amd64.deb',
          'sudo dpkg -i auditbeat-{config.kibana.version}-amd64.deb',
        ],
        textPost: i18n.translate(
          'home.tutorials.common.auditbeatInstructions.install.debTextPost',
          {
            defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({linkUrl}).',
            values: {
              linkUrl: 'https://www.elastic.co/downloads/beats/auditbeat',
            },
          }
        ),
      },
      RPM: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.install.rpmTitle', {
          defaultMessage: 'Download and install Auditbeat',
        }),
        textPre: i18n.translate('home.tutorials.common.auditbeatInstructions.install.rpmTextPre', {
          defaultMessage: 'First time using Auditbeat? See the [Quick Start]({linkUrl}).',
          values: {
            linkUrl: '{config.docs.beats.auditbeat}/auditbeat-installation-configuration.html',
          },
        }),
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-{config.kibana.version}-x86_64.rpm',
          'sudo rpm -vi auditbeat-{config.kibana.version}-x86_64.rpm',
        ],
        textPost: i18n.translate(
          'home.tutorials.common.auditbeatInstructions.install.rpmTextPost',
          {
            defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({linkUrl}).',
            values: {
              linkUrl: 'https://www.elastic.co/downloads/beats/auditbeat',
            },
          }
        ),
      },
      WINDOWS: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.install.windowsTitle', {
          defaultMessage: 'Download and install Auditbeat',
        }),
        textPre: i18n.translate(
          'home.tutorials.common.auditbeatInstructions.install.windowsTextPre',
          {
            defaultMessage:
              'First time using Auditbeat? See the [Quick Start]({guideLinkUrl}).\n\
 1. Download the Auditbeat Windows zip file from the [Download]({auditbeatLinkUrl}) page.\n\
 2. Extract the contents of the zip file into {folderPath}.\n\
 3. Rename the `{directoryName}` directory to `Auditbeat`.\n\
 4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select \
**Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n\
 5. From the PowerShell prompt, run the following commands to install Auditbeat as a Windows service.',
            values: {
              folderPath: '`C:\\Program Files`',
              guideLinkUrl:
                '{config.docs.beats.auditbeat}/auditbeat-installation-configuration.html',
              auditbeatLinkUrl: 'https://www.elastic.co/downloads/beats/auditbeat',
              directoryName: 'auditbeat-{config.kibana.version}-windows',
            },
          }
        ),
        commands: ['cd "C:\\Program Files\\Auditbeat"', '.\\install-service-auditbeat.ps1'],
        textPost: i18n.translate(
          'home.tutorials.common.auditbeatInstructions.install.windowsTextPost',
          {
            defaultMessage:
              'Modify the settings under {propertyName} in the {auditbeatPath} file to point to your Elasticsearch installation.',
            values: {
              propertyName: '`output.elasticsearch`',
              auditbeatPath: '`C:\\Program Files\\Auditbeat\\auditbeat.yml`',
            },
          }
        ),
      },
    },
    START: {
      OSX: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.start.osxTitle', {
          defaultMessage: 'Start Auditbeat',
        }),
        textPre: i18n.translate('home.tutorials.common.auditbeatInstructions.start.osxTextPre', {
          defaultMessage:
            'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
        }),
        commands: ['./auditbeat setup', './auditbeat -e'],
      },
      DEB: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.start.debTitle', {
          defaultMessage: 'Start Auditbeat',
        }),
        textPre: i18n.translate('home.tutorials.common.auditbeatInstructions.start.debTextPre', {
          defaultMessage:
            'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
        }),
        commands: ['sudo auditbeat setup', 'sudo service auditbeat start'],
      },
      RPM: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.start.rpmTitle', {
          defaultMessage: 'Start Auditbeat',
        }),
        textPre: i18n.translate('home.tutorials.common.auditbeatInstructions.start.rpmTextPre', {
          defaultMessage:
            'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
        }),
        commands: ['sudo auditbeat setup', 'sudo service auditbeat start'],
      },
      WINDOWS: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.start.windowsTitle', {
          defaultMessage: 'Start Auditbeat',
        }),
        textPre: i18n.translate(
          'home.tutorials.common.auditbeatInstructions.start.windowsTextPre',
          {
            defaultMessage:
              'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
          }
        ),
        commands: ['.\\auditbeat.exe setup', 'Start-Service auditbeat'],
      },
    },
    CONFIG: {
      OSX: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.config.osxTitle', {
          defaultMessage: 'Edit the configuration',
        }),
        textPre: i18n.translate('home.tutorials.common.auditbeatInstructions.config.osxTextPre', {
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
          "  # If using Elasticsearch's default certificate",
          '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"',
          'setup.kibana:',
          '  host: "<kibana_url>"',
          getSpaceIdForBeatsTutorial(context),
        ],
        textPost: i18n.translate(
          'home.tutorials.common.auditbeatInstructions.config.osxTextPostMarkdown',
          {
            defaultMessage:
              'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
            Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
            default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.',
            values: {
              passwordTemplate: '`<password>`',
              esUrlTemplate: '`<es_url>`',
              kibanaUrlTemplate: '`<kibana_url>`',
              configureSslUrl: SSL_DOC_URL,
              esCertFingerprintTemplate: '`<es cert fingerprint>`',
            },
          }
        ),
      },
      DEB: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.config.debTitle', {
          defaultMessage: 'Edit the configuration',
        }),
        textPre: i18n.translate('home.tutorials.common.auditbeatInstructions.config.debTextPre', {
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
          "  # If using Elasticsearch's default certificate",
          '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"',
          'setup.kibana:',
          '  host: "<kibana_url>"',
          getSpaceIdForBeatsTutorial(context),
        ],
        textPost: i18n.translate(
          'home.tutorials.common.auditbeatInstructions.config.debTextPostMarkdown',
          {
            defaultMessage:
              'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
            Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
            default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.',
            values: {
              passwordTemplate: '`<password>`',
              esUrlTemplate: '`<es_url>`',
              kibanaUrlTemplate: '`<kibana_url>`',
              configureSslUrl: SSL_DOC_URL,
              esCertFingerprintTemplate: '`<es cert fingerprint>`',
            },
          }
        ),
      },
      RPM: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.config.rpmTitle', {
          defaultMessage: 'Edit the configuration',
        }),
        textPre: i18n.translate('home.tutorials.common.auditbeatInstructions.config.rpmTextPre', {
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
          "  # If using Elasticsearch's default certificate",
          '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"',
          'setup.kibana:',
          '  host: "<kibana_url>"',
          getSpaceIdForBeatsTutorial(context),
        ],
        textPost: i18n.translate(
          'home.tutorials.common.auditbeatInstructions.config.rpmTextPostMarkdown',
          {
            defaultMessage:
              'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
            Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
            default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.',
            values: {
              passwordTemplate: '`<password>`',
              esUrlTemplate: '`<es_url>`',
              kibanaUrlTemplate: '`<kibana_url>`',
              configureSslUrl: SSL_DOC_URL,
              esCertFingerprintTemplate: '`<es cert fingerprint>`',
            },
          }
        ),
      },
      WINDOWS: {
        title: i18n.translate('home.tutorials.common.auditbeatInstructions.config.windowsTitle', {
          defaultMessage: 'Edit the configuration',
        }),
        textPre: i18n.translate(
          'home.tutorials.common.auditbeatInstructions.config.windowsTextPre',
          {
            defaultMessage: 'Modify {path} to set the connection information:',
            values: {
              path: '`C:\\Program Files\\Auditbeat\\auditbeat.yml`',
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
          'home.tutorials.common.auditbeatInstructions.config.windowsTextPostMarkdown',
          {
            defaultMessage:
              'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
              Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
              default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.',
            values: {
              passwordTemplate: '`<password>`',
              esUrlTemplate: '`<es_url>`',
              kibanaUrlTemplate: '`<kibana_url>`',
              configureSslUrl: SSL_DOC_URL,
              esCertFingerprintTemplate: '`<es cert fingerprint>`',
            },
          }
        ),
      },
    },
  };
};

export const createAuditbeatCloudInstructions = () => ({
  CONFIG: {
    OSX: {
      title: i18n.translate('home.tutorials.common.auditbeatCloudInstructions.config.osxTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.auditbeatCloudInstructions.config.osxTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`auditbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    DEB: {
      title: i18n.translate('home.tutorials.common.auditbeatCloudInstructions.config.debTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.auditbeatCloudInstructions.config.debTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`/etc/auditbeat/auditbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    RPM: {
      title: i18n.translate('home.tutorials.common.auditbeatCloudInstructions.config.rpmTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.auditbeatCloudInstructions.config.rpmTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`/etc/auditbeat/auditbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    WINDOWS: {
      title: i18n.translate(
        'home.tutorials.common.auditbeatCloudInstructions.config.windowsTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.auditbeatCloudInstructions.config.windowsTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`C:\\Program Files\\Auditbeat\\auditbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
  },
});

export function auditbeatStatusCheck() {
  return {
    title: i18n.translate('home.tutorials.common.auditbeatStatusCheck.title', {
      defaultMessage: 'Status',
    }),
    text: i18n.translate('home.tutorials.common.auditbeatStatusCheck.text', {
      defaultMessage: 'Check that data is received from Auditbeat',
    }),
    btnLabel: i18n.translate('home.tutorials.common.auditbeatStatusCheck.buttonLabel', {
      defaultMessage: 'Check data',
    }),
    success: i18n.translate('home.tutorials.common.auditbeatStatusCheck.successText', {
      defaultMessage: 'Data successfully received',
    }),
    error: i18n.translate('home.tutorials.common.auditbeatStatusCheck.errorText', {
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

export function onPremInstructions(platforms: readonly Platform[], context: TutorialContext) {
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
      instructions,
    });
  }
  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.auditbeat.premInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: variants,
        statusCheck: auditbeatStatusCheck(),
      },
    ],
  };
}

export function onPremCloudInstructions(platforms: readonly Platform[], context: TutorialContext) {
  const AUDITBEAT_INSTRUCTIONS = createAuditbeatInstructions(context);
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
        title: i18n.translate(
          'home.tutorials.common.auditbeat.premCloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: variants,
        statusCheck: auditbeatStatusCheck(),
      },
    ],
  };
}

export function cloudInstructions(platforms: readonly Platform[], context: TutorialContext) {
  const AUDITBEAT_INSTRUCTIONS = createAuditbeatInstructions(context);
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
        title: i18n.translate(
          'home.tutorials.common.auditbeat.cloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: variants,
        statusCheck: auditbeatStatusCheck(),
      },
    ],
  };
}
