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

export const createFilebeatInstructions = (context: TutorialContext) => {
  const SSL_DOC_URL = `https://www.elastic.co/guide/en/beats/filebeat/${context.kibanaBranch}/configuration-ssl.html#ca-sha256`;

  return {
    INSTALL: {
      OSX: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.install.osxTitle', {
          defaultMessage: 'Download and install Filebeat',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.install.osxTextPre', {
          defaultMessage: 'First time using Filebeat? See the [Quick Start]({linkUrl}).',
          values: {
            linkUrl: '{config.docs.beats.filebeat}/filebeat-installation-configuration.html',
          },
        }),
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
          'tar xzvf filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
          'cd filebeat-{config.kibana.version}-darwin-x86_64/',
        ],
      },
      DEB: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.install.debTitle', {
          defaultMessage: 'Download and install Filebeat',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.install.debTextPre', {
          defaultMessage: 'First time using Filebeat? See the [Quick Start]({linkUrl}).',
          values: {
            linkUrl: '{config.docs.beats.filebeat}/filebeat-installation-configuration.html',
          },
        }),
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-amd64.deb',
          'sudo dpkg -i filebeat-{config.kibana.version}-amd64.deb',
        ],
        textPost: i18n.translate('home.tutorials.common.filebeatInstructions.install.debTextPost', {
          defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({linkUrl}).',
          values: {
            linkUrl: 'https://www.elastic.co/downloads/beats/filebeat',
          },
        }),
      },
      RPM: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.install.rpmTitle', {
          defaultMessage: 'Download and install Filebeat',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.install.rpmTextPre', {
          defaultMessage: 'First time using Filebeat? See the [Quick Start]({linkUrl}).',
          values: {
            linkUrl: '{config.docs.beats.filebeat}/filebeat-installation-configuration.html',
          },
        }),
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-x86_64.rpm',
          'sudo rpm -vi filebeat-{config.kibana.version}-x86_64.rpm',
        ],
        textPost: i18n.translate('home.tutorials.common.filebeatInstructions.install.rpmTextPost', {
          defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({linkUrl}).',
          values: {
            linkUrl: 'https://www.elastic.co/downloads/beats/filebeat',
          },
        }),
      },
      WINDOWS: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.install.windowsTitle', {
          defaultMessage: 'Download and install Filebeat',
        }),
        textPre: i18n.translate(
          'home.tutorials.common.filebeatInstructions.install.windowsTextPre',
          {
            defaultMessage:
              'First time using Filebeat? See the [Quick Start]({guideLinkUrl}).\n\
 1. Download the Filebeat Windows zip file from the [Download]({filebeatLinkUrl}) page.\n\
 2. Extract the contents of the zip file into {folderPath}.\n\
 3. Rename the `{directoryName}` directory to `Filebeat`.\n\
 4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select \
**Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n\
 5. From the PowerShell prompt, run the following commands to install Filebeat as a Windows service.',
            values: {
              folderPath: '`C:\\Program Files`',
              guideLinkUrl: '{config.docs.beats.filebeat}/filebeat-installation-configuration.html',
              filebeatLinkUrl: 'https://www.elastic.co/downloads/beats/filebeat',
              directoryName: 'filebeat-{config.kibana.version}-windows',
            },
          }
        ),
        commands: ['cd "C:\\Program Files\\Filebeat"', '.\\install-service-filebeat.ps1'],
        textPost: i18n.translate(
          'home.tutorials.common.filebeatInstructions.install.windowsTextPost',
          {
            defaultMessage:
              'Modify the settings under {propertyName} in the {filebeatPath} file to point to your Elasticsearch installation.',
            values: {
              propertyName: '`output.elasticsearch`',
              filebeatPath: '`C:\\Program Files\\Filebeat\\filebeat.yml`',
            },
          }
        ),
      },
    },
    START: {
      OSX: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.start.osxTitle', {
          defaultMessage: 'Start Filebeat',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.start.osxTextPre', {
          defaultMessage:
            'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
        }),
        commands: ['./filebeat setup', './filebeat -e'],
      },
      DEB: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.start.debTitle', {
          defaultMessage: 'Start Filebeat',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.start.debTextPre', {
          defaultMessage:
            'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
        }),
        commands: ['sudo filebeat setup', 'sudo service filebeat start'],
      },
      RPM: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.start.rpmTitle', {
          defaultMessage: 'Start Filebeat',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.start.rpmTextPre', {
          defaultMessage:
            'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
        }),
        commands: ['sudo filebeat setup', 'sudo service filebeat start'],
      },
      WINDOWS: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.start.windowsTitle', {
          defaultMessage: 'Start Filebeat',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.start.windowsTextPre', {
          defaultMessage:
            'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
        }),
        commands: ['.\\filebeat.exe setup', 'Start-Service filebeat'],
      },
    },
    CONFIG: {
      OSX: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.config.osxTitle', {
          defaultMessage: 'Edit the configuration',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.config.osxTextPre', {
          defaultMessage: 'Modify {path} to set the connection information:',
          values: {
            path: '`filebeat.yml`',
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
          'home.tutorials.common.filebeatInstructions.config.osxTextPostMarkdown',
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
              linkUrl: '{config.docs.beats.filebeat}/securing-filebeat.html',
            },
          }
        ),
      },
      DEB: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.config.debTitle', {
          defaultMessage: 'Edit the configuration',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.config.debTextPre', {
          defaultMessage: 'Modify {path} to set the connection information:',
          values: {
            path: '`/etc/filebeat/filebeat.yml`',
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
          'home.tutorials.common.filebeatInstructions.config.debTextPostMarkdown',
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
              linkUrl: '{config.docs.beats.filebeat}/securing-filebeat.html',
            },
          }
        ),
      },
      RPM: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.config.rpmTitle', {
          defaultMessage: 'Edit the configuration',
        }),
        textPre: i18n.translate('home.tutorials.common.filebeatInstructions.config.rpmTextPre', {
          defaultMessage: 'Modify {path} to set the connection information:',
          values: {
            path: '`/etc/filebeat/filebeat.yml`',
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
          'home.tutorials.common.filebeatInstructions.config.rpmTextPostMarkdown',
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
              linkUrl: '{config.docs.beats.filebeat}/securing-filebeat.html',
            },
          }
        ),
      },
      WINDOWS: {
        title: i18n.translate('home.tutorials.common.filebeatInstructions.config.windowsTitle', {
          defaultMessage: 'Edit the configuration',
        }),
        textPre: i18n.translate(
          'home.tutorials.common.filebeatInstructions.config.windowsTextPre',
          {
            defaultMessage: 'Modify {path} to set the connection information:',
            values: {
              path: '`C:\\Program Files\\Filebeat\\filebeat.yml`',
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
          'home.tutorials.common.filebeatInstructions.config.windowsTextPostMarkdown',
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
              linkUrl: '{config.docs.beats.filebeat}/securing-filebeat.html',
            },
          }
        ),
      },
    },
  };
};

export const createFilebeatCloudInstructions = () => ({
  CONFIG: {
    OSX: {
      title: i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.osxTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.osxTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`filebeat.yml`',
        },
      }),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    DEB: {
      title: i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.debTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.debTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`/etc/filebeat/filebeat.yml`',
        },
      }),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    RPM: {
      title: i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.rpmTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.rpmTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`/etc/filebeat/filebeat.yml`',
        },
      }),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    WINDOWS: {
      title: i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.windowsTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.filebeatCloudInstructions.config.windowsTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`C:\\Program Files\\Filebeat\\filebeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
  },
});

export const createFilebeatCloudInstructionsServerless = () => ({
  CONFIG: {
    OSX: {
      title: i18n.translate(
        'home.tutorials.common.filebeatCloudInstructionsServerless.config.osxTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.filebeatCloudInstructionsServerless.config.osxTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`filebeat.yml`',
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
        'home.tutorials.common.filebeatCloudInstructionsServerless.config.debTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.filebeatCloudInstructionsServerless.config.debTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`/etc/filebeat/filebeat.yml`',
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
        'home.tutorials.common.filebeatCloudInstructionsServerless.config.rpmTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.filebeatCloudInstructionsServerless.config.rpmTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`/etc/filebeat/filebeat.yml`',
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
        'home.tutorials.common.filebeatCloudInstructionsServerless.config.windowsTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.filebeatCloudInstructionsServerless.config.windowsTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`C:\\Program Files\\Filebeat\\filebeat.yml`',
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

export function filebeatEnableInstructions(moduleName: string) {
  return {
    OSX: {
      title: i18n.translate('home.tutorials.common.filebeatEnableInstructions.osxTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: { moduleName },
      }),
      textPre: i18n.translate('home.tutorials.common.filebeatEnableInstructions.osxTextPre', {
        defaultMessage: 'From the installation directory, run:',
      }),
      commands: ['./filebeat modules enable ' + moduleName],
      textPost: i18n.translate('home.tutorials.common.filebeatEnableInstructions.osxTextPost', {
        defaultMessage:
          'Modify the settings in the `modules.d/{moduleName}.yml` file. You must enable at least one fileset.',
        values: { moduleName },
      }),
    },
    DEB: {
      title: i18n.translate('home.tutorials.common.filebeatEnableInstructions.debTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: { moduleName },
      }),
      commands: ['sudo filebeat modules enable ' + moduleName],
      textPost: i18n.translate('home.tutorials.common.filebeatEnableInstructions.debTextPost', {
        defaultMessage:
          'Modify the settings in the `/etc/filebeat/modules.d/{moduleName}.yml` file. You must enable at least one fileset.',
        values: { moduleName },
      }),
    },
    RPM: {
      title: i18n.translate('home.tutorials.common.filebeatEnableInstructions.rpmTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: { moduleName },
      }),
      commands: ['sudo filebeat modules enable ' + moduleName],
      textPost: i18n.translate('home.tutorials.common.filebeatEnableInstructions.rpmTextPost', {
        defaultMessage:
          'Modify the settings in the `/etc/filebeat/modules.d/{moduleName}.yml` file. You must enable at least one fileset.',
        values: { moduleName },
      }),
    },
    WINDOWS: {
      title: i18n.translate('home.tutorials.common.filebeatEnableInstructions.windowsTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: { moduleName },
      }),
      textPre: i18n.translate('home.tutorials.common.filebeatEnableInstructions.windowsTextPre', {
        defaultMessage: 'From the {path} folder, run:',
        values: { path: `C:\\Program Files\\Filebeat` },
      }),
      commands: ['filebeat.exe modules enable ' + moduleName],
      textPost: i18n.translate('home.tutorials.common.filebeatEnableInstructions.windowsTextPost', {
        defaultMessage:
          'Modify the settings in the `modules.d/{moduleName}.yml` file. You must enable at least one fileset.',
        values: { moduleName },
      }),
    },
  };
}

export function filebeatStatusCheck(moduleName: string) {
  return {
    title: i18n.translate('home.tutorials.common.filebeatStatusCheck.title', {
      defaultMessage: 'Module status',
    }),
    text: i18n.translate('home.tutorials.common.filebeatStatusCheck.text', {
      defaultMessage: 'Check that data is received from the Filebeat `{moduleName}` module',
      values: { moduleName },
    }),
    btnLabel: i18n.translate('home.tutorials.common.filebeatStatusCheck.buttonLabel', {
      defaultMessage: 'Check data',
    }),
    success: i18n.translate('home.tutorials.common.filebeatStatusCheck.successText', {
      defaultMessage: 'Data successfully received from this module',
    }),
    error: i18n.translate('home.tutorials.common.filebeatStatusCheck.errorText', {
      defaultMessage: 'No data has been received from this module yet',
    }),
    esHitsCheck: {
      index: 'filebeat-*',
      query: {
        bool: {
          filter: {
            term: {
              'event.module': moduleName,
            },
          },
        },
      },
    },
  };
}

export function onPremInstructions(
  moduleName: string,
  platforms: readonly Platform[] = [],
  context: TutorialContext
) {
  const FILEBEAT_INSTRUCTIONS = createFilebeatInstructions(context);

  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const instructions = [];
    instructions.push(FILEBEAT_INSTRUCTIONS.INSTALL[platform]);
    instructions.push(FILEBEAT_INSTRUCTIONS.CONFIG[platform]);
    instructions.push(filebeatEnableInstructions(moduleName)[platform]);
    instructions.push(FILEBEAT_INSTRUCTIONS.START[platform]);
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions,
    });
  }
  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.filebeat.premInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: variants,
        statusCheck: filebeatStatusCheck(moduleName),
      },
    ],
  };
}

export function onPremCloudInstructions(
  moduleName: string,
  platforms: readonly Platform[] = [],
  context: TutorialContext
) {
  const FILEBEAT_INSTRUCTIONS = createFilebeatInstructions(context);
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
        FILEBEAT_INSTRUCTIONS.INSTALL[platform],
        FILEBEAT_INSTRUCTIONS.CONFIG[platform],
        filebeatEnableInstructions(moduleName)[platform],
        FILEBEAT_INSTRUCTIONS.START[platform],
      ],
    });
  }

  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.filebeat.premCloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: variants,
        statusCheck: filebeatStatusCheck(moduleName),
      },
    ],
  };
}

export function cloudInstructions(
  moduleName: string,
  platforms: readonly Platform[] = [],
  context: TutorialContext
) {
  const FILEBEAT_INSTRUCTIONS = createFilebeatInstructions(context);
  const FILEBEAT_CLOUD_INSTRUCTIONS = context.isServerless
    ? createFilebeatCloudInstructionsServerless()
    : createFilebeatCloudInstructions();

  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: [
        FILEBEAT_INSTRUCTIONS.INSTALL[platform],
        FILEBEAT_CLOUD_INSTRUCTIONS.CONFIG[platform],
        filebeatEnableInstructions(moduleName)[platform],
        FILEBEAT_INSTRUCTIONS.START[platform],
      ],
    });
  }

  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.filebeat.cloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: variants,
        statusCheck: filebeatStatusCheck(moduleName),
      },
    ],
  };
}
