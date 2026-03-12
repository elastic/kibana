/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { memoize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { INSTRUCTION_VARIANT } from '../../../common/instruction_variant';
import { createTrycloudOption1, createTrycloudOption2 } from './onprem_cloud_instructions';
import { getSpaceIdForBeatsTutorial } from './get_space_id_for_beats_tutorial';
import type { TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
import { cloudPasswordAndResetLink, cloudServerlessApiKeyNote } from './cloud_instructions';

export const createMetricbeatInstructions = memoize(
  (context: TutorialContext) => {
    const SSL_DOC_URL = `https://www.elastic.co/guide/en/beats/metricbeat/${context.kibanaBranch}/configuration-ssl.html#ca-sha256`;
    const spaceId = getSpaceIdForBeatsTutorial(context);
    return {
      INSTALL: {
        OSX: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.install.osxTitle', {
            defaultMessage: 'Download and install Metricbeat',
          }),
          textPre: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.install.osxTextPre',
            {
              defaultMessage: 'First time using Metricbeat? See the [Quick Start]({link}).',
              values: {
                link: '{config.docs.beats.metricbeat}/metricbeat-installation-configuration.html',
              },
            }
          ),
          commands: [
            'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
            'tar xzvf metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
            'cd metricbeat-{config.kibana.version}-darwin-x86_64/',
          ],
        },
        DEB: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.install.debTitle', {
            defaultMessage: 'Download and install Metricbeat',
          }),
          textPre: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.install.debTextPre',
            {
              defaultMessage: 'First time using Metricbeat? See the [Quick Start]({link}).',
              values: {
                link: '{config.docs.beats.metricbeat}/metricbeat-installation-configuration.html',
              },
            }
          ),
          commands: [
            'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-amd64.deb',
            'sudo dpkg -i metricbeat-{config.kibana.version}-amd64.deb',
          ],
          textPost: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.install.debTextPost',
            {
              defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({link}).',
              values: { link: 'https://www.elastic.co/downloads/beats/metricbeat' },
            }
          ),
        },
        RPM: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.install.rpmTitle', {
            defaultMessage: 'Download and install Metricbeat',
          }),
          textPre: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.install.rpmTextPre',
            {
              defaultMessage: 'First time using Metricbeat? See the [Quick Start]({link}).',
              values: {
                link: '{config.docs.beats.metricbeat}/metricbeat-installation-configuration.html',
              },
            }
          ),
          commands: [
            'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-x86_64.rpm',
            'sudo rpm -vi metricbeat-{config.kibana.version}-x86_64.rpm',
          ],
          textPost: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.install.rpmTextPost',
            {
              defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({link}).',
              values: { link: 'https://www.elastic.co/downloads/beats/metricbeat' },
            }
          ),
        },
        WINDOWS: {
          title: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.install.windowsTitle',
            {
              defaultMessage: 'Download and install Metricbeat',
            }
          ),
          textPre: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.install.windowsTextPre',
            {
              defaultMessage:
                'First time using Metricbeat? See the [Quick Start]({metricbeatLink}).\n\
 1. Download the Metricbeat Windows zip file from the [Download]({elasticLink}) page.\n\
 2. Extract the contents of the zip file into {folderPath}.\n\
 3. Rename the {directoryName} directory to `Metricbeat`.\n\
 4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select \
**Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n\
 5. From the PowerShell prompt, run the following commands to install Metricbeat as a Windows service.',
              values: {
                directoryName: '`metricbeat-{config.kibana.version}-windows`',
                folderPath: '`C:\\Program Files`',
                metricbeatLink:
                  '{config.docs.beats.metricbeat}/metricbeat-installation-configuration.html',
                elasticLink: 'https://www.elastic.co/downloads/beats/metricbeat',
              },
            }
          ),
          commands: ['cd "C:\\Program Files\\Metricbeat"', '.\\install-service-metricbeat.ps1'],
          textPost: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.install.windowsTextPost',
            {
              defaultMessage:
                'Modify the settings under `output.elasticsearch` in the {path} file to point to your Elasticsearch installation.',
              values: { path: '`C:\\Program Files\\Metricbeat\\metricbeat.yml`' },
            }
          ),
        },
      },
      START: {
        OSX: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.start.osxTitle', {
            defaultMessage: 'Start Metricbeat',
          }),
          textPre: i18n.translate('home.tutorials.common.metricbeatInstructions.start.osxTextPre', {
            defaultMessage:
              'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
          }),
          commands: ['./metricbeat setup', './metricbeat -e'],
        },
        DEB: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.start.debTitle', {
            defaultMessage: 'Start Metricbeat',
          }),
          textPre: i18n.translate('home.tutorials.common.metricbeatInstructions.start.debTextPre', {
            defaultMessage:
              'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
          }),
          commands: ['sudo metricbeat setup', 'sudo service metricbeat start'],
        },
        RPM: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.start.rpmTitle', {
            defaultMessage: 'Start Metricbeat',
          }),
          textPre: i18n.translate('home.tutorials.common.metricbeatInstructions.start.rpmTextPre', {
            defaultMessage:
              'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
          }),
          commands: ['sudo metricbeat setup', 'sudo service metricbeat start'],
        },
        WINDOWS: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.start.windowsTitle', {
            defaultMessage: 'Start Metricbeat',
          }),
          textPre: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.start.windowsTextPre',
            {
              defaultMessage:
                'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
            }
          ),
          commands: ['.\\metricbeat.exe setup', 'Start-Service metricbeat'],
        },
      },
      CONFIG: {
        OSX: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.config.osxTitle', {
            defaultMessage: 'Edit the configuration',
          }),
          textPre: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.config.osxTextPre',
            {
              defaultMessage: 'Modify {path} to set the connection information:',
              values: {
                path: '`metricbeat.yml`',
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
            spaceId,
          ],
          textPost: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.config.osxTextPostMarkdown',
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
                linkUrl: '{config.docs.beats.metricbeat}/securing-metricbeat.html',
              },
            }
          ),
        },
        DEB: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.config.debTitle', {
            defaultMessage: 'Edit the configuration',
          }),
          textPre: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.config.debTextPre',
            {
              defaultMessage: 'Modify {path} to set the connection information:',
              values: {
                path: '`/etc/metricbeat/metricbeat.yml`',
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
            spaceId,
          ],
          textPost: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.config.debTextPostMarkdown',
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
                linkUrl: '{config.docs.beats.metricbeat}/securing-metricbeat.html',
              },
            }
          ),
        },
        RPM: {
          title: i18n.translate('home.tutorials.common.metricbeatInstructions.config.rpmTitle', {
            defaultMessage: 'Edit the configuration',
          }),
          textPre: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.config.rpmTextPre',
            {
              defaultMessage: 'Modify {path} to set the connection information:',
              values: {
                path: '`/etc/metricbeat/metricbeat.yml`',
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
            spaceId,
          ],
          textPost: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.config.rpmTextPostMarkdown',
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
                linkUrl: '{config.docs.beats.metricbeat}/securing-metricbeat.html',
              },
            }
          ),
        },
        WINDOWS: {
          title: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.config.windowsTitle',
            {
              defaultMessage: 'Edit the configuration',
            }
          ),
          textPre: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.config.windowsTextPre',
            {
              defaultMessage: 'Modify {path} to set the connection information:',
              values: {
                path: '`C:\\Program Files\\Metricbeat\\metricbeat.yml`',
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
            spaceId,
          ],
          textPost: i18n.translate(
            'home.tutorials.common.metricbeatInstructions.config.windowsTextPostMarkdown',
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
                linkUrl: '{config.docs.beats.metricbeat}/securing-metricbeat.html',
              },
            }
          ),
        },
      },
    };
  },
  // key resolver based on the context keys effectively used
  (context: TutorialContext) => {
    return `${context.kibanaBranch}|${context.spaceId ?? 'default'}`;
  }
);

export const createMetricbeatCloudInstructions = memoize(() => ({
  CONFIG: {
    OSX: {
      title: i18n.translate('home.tutorials.common.metricbeatCloudInstructions.config.osxTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.osxTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`metricbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    DEB: {
      title: i18n.translate('home.tutorials.common.metricbeatCloudInstructions.config.debTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.debTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`/etc/metricbeat/metricbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    RPM: {
      title: i18n.translate('home.tutorials.common.metricbeatCloudInstructions.config.rpmTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.rpmTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`/etc/metricbeat/metricbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
    WINDOWS: {
      title: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.windowsTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.windowsTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`C:\\Program Files\\Metricbeat\\metricbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: cloudPasswordAndResetLink,
    },
  },
}));

export const createMetricbeatCloudInstructionsServerless = () => ({
  CONFIG: {
    OSX: {
      title: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructionsServerless.config.osxTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructionsServerless.config.osxTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`metricbeat.yml`',
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
        'home.tutorials.common.metricbeatCloudInstructionsServerless.config.debTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructionsServerless.config.debTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`/etc/metricbeat/metricbeat.yml`',
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
        'home.tutorials.common.metricbeatCloudInstructionsServerless.config.rpmTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructionsServerless.config.rpmTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`/etc/metricbeat/metricbeat.yml`',
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
        'home.tutorials.common.metricbeatCloudInstructionsServerless.config.windowsTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructionsServerless.config.windowsTextPre',
        {
          defaultMessage:
            'Modify {path} to set the connection information for Elastic Cloud Serverless:',
          values: {
            path: '`C:\\Program Files\\Metricbeat\\metricbeat.yml`',
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

export function metricbeatEnableInstructions(moduleName: string) {
  return {
    OSX: {
      title: i18n.translate('home.tutorials.common.metricbeatEnableInstructions.osxTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: { moduleName },
      }),
      textPre: i18n.translate('home.tutorials.common.metricbeatEnableInstructions.osxTextPre', {
        defaultMessage: 'From the installation directory, run:',
      }),
      commands: ['./metricbeat modules enable ' + moduleName],
      textPost: i18n.translate('home.tutorials.common.metricbeatEnableInstructions.osxTextPost', {
        defaultMessage: 'Modify the settings in the `modules.d/{moduleName}.yml` file.',
        values: { moduleName },
      }),
    },
    DEB: {
      title: i18n.translate('home.tutorials.common.metricbeatEnableInstructions.debTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: { moduleName },
      }),
      commands: ['sudo metricbeat modules enable ' + moduleName],
      textPost: i18n.translate('home.tutorials.common.metricbeatEnableInstructions.debTextPost', {
        defaultMessage:
          'Modify the settings in the `/etc/metricbeat/modules.d/{moduleName}.yml` file.',
        values: { moduleName },
      }),
    },
    RPM: {
      title: i18n.translate('home.tutorials.common.metricbeatEnableInstructions.rpmTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: { moduleName },
      }),
      commands: ['sudo metricbeat modules enable ' + moduleName],
      textPost: i18n.translate('home.tutorials.common.metricbeatEnableInstructions.rpmTextPost', {
        defaultMessage:
          'Modify the settings in the `/etc/metricbeat/modules.d/{moduleName}.yml` file.',
        values: { moduleName },
      }),
    },
    WINDOWS: {
      title: i18n.translate('home.tutorials.common.metricbeatEnableInstructions.windowsTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: { moduleName },
      }),
      textPre: i18n.translate('home.tutorials.common.metricbeatEnableInstructions.windowsTextPre', {
        defaultMessage: 'From the {path} folder, run:',
        values: { path: `C:\\Program Files\\Metricbeat` },
      }),
      commands: ['.\\metricbeat.exe modules enable ' + moduleName],
      textPost: i18n.translate(
        'home.tutorials.common.metricbeatEnableInstructions.windowsTextPost',
        {
          defaultMessage: 'Modify the settings in the `modules.d/{moduleName}.yml` file.',
          values: { moduleName },
        }
      ),
    },
  };
}

export function metricbeatStatusCheck(moduleName: string) {
  return {
    title: i18n.translate('home.tutorials.common.metricbeatStatusCheck.title', {
      defaultMessage: 'Module status',
    }),
    text: i18n.translate('home.tutorials.common.metricbeatStatusCheck.text', {
      defaultMessage: 'Check that data is received from the Metricbeat `{moduleName}` module',
      values: { moduleName },
    }),
    btnLabel: i18n.translate('home.tutorials.common.metricbeatStatusCheck.buttonLabel', {
      defaultMessage: 'Check data',
    }),
    success: i18n.translate('home.tutorials.common.metricbeatStatusCheck.successText', {
      defaultMessage: 'Data successfully received from this module',
    }),
    error: i18n.translate('home.tutorials.common.metricbeatStatusCheck.errorText', {
      defaultMessage: 'No data has been received from this module yet',
    }),
    esHitsCheck: {
      index: 'metricbeat-*',
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

export function onPremInstructions(moduleName: string, context: TutorialContext) {
  const METRICBEAT_INSTRUCTIONS = createMetricbeatInstructions(context);
  const METRICBEAT_ENABLE_INSTRUCTIONS = metricbeatEnableInstructions(moduleName);

  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.metricbeat.premInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              METRICBEAT_INSTRUCTIONS.CONFIG.OSX,
              METRICBEAT_ENABLE_INSTRUCTIONS.OSX,
              METRICBEAT_INSTRUCTIONS.START.OSX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              METRICBEAT_INSTRUCTIONS.CONFIG.DEB,
              METRICBEAT_ENABLE_INSTRUCTIONS.DEB,
              METRICBEAT_INSTRUCTIONS.START.DEB,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              METRICBEAT_INSTRUCTIONS.CONFIG.RPM,
              METRICBEAT_ENABLE_INSTRUCTIONS.RPM,
              METRICBEAT_INSTRUCTIONS.START.RPM,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              METRICBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              METRICBEAT_ENABLE_INSTRUCTIONS.WINDOWS,
              METRICBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: metricbeatStatusCheck(moduleName),
      },
    ],
  };
}

export function onPremCloudInstructions(moduleName: string, context: TutorialContext) {
  const TRYCLOUD_OPTION1 = createTrycloudOption1();
  const TRYCLOUD_OPTION2 = createTrycloudOption2();
  const METRICBEAT_INSTRUCTIONS = createMetricbeatInstructions(context);
  const METRICBEAT_ENABLE_INSTRUCTIONS = metricbeatEnableInstructions(moduleName);

  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.metricbeat.premCloudInstructions.gettingStarted.title',
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
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              METRICBEAT_INSTRUCTIONS.CONFIG.OSX,
              METRICBEAT_ENABLE_INSTRUCTIONS.OSX,
              METRICBEAT_INSTRUCTIONS.START.OSX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              METRICBEAT_INSTRUCTIONS.CONFIG.DEB,
              METRICBEAT_ENABLE_INSTRUCTIONS.DEB,
              METRICBEAT_INSTRUCTIONS.START.DEB,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              METRICBEAT_INSTRUCTIONS.CONFIG.RPM,
              METRICBEAT_ENABLE_INSTRUCTIONS.RPM,
              METRICBEAT_INSTRUCTIONS.START.RPM,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              METRICBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              METRICBEAT_ENABLE_INSTRUCTIONS.WINDOWS,
              METRICBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: metricbeatStatusCheck(moduleName),
      },
    ],
  };
}

export function cloudInstructions(moduleName: string, context: TutorialContext) {
  const METRICBEAT_INSTRUCTIONS = createMetricbeatInstructions(context);
  const METRICBEAT_CLOUD_INSTRUCTIONS = context.isServerless
    ? createMetricbeatCloudInstructionsServerless()
    : createMetricbeatCloudInstructions();
  const METRICBEAT_ENABLE_INSTRUCTIONS = metricbeatEnableInstructions(moduleName);

  return {
    instructionSets: [
      {
        title: i18n.translate(
          'home.tutorials.common.metricbeat.cloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.OSX,
              METRICBEAT_ENABLE_INSTRUCTIONS.OSX,
              METRICBEAT_INSTRUCTIONS.START.OSX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.DEB,
              METRICBEAT_ENABLE_INSTRUCTIONS.DEB,
              METRICBEAT_INSTRUCTIONS.START.DEB,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.RPM,
              METRICBEAT_ENABLE_INSTRUCTIONS.RPM,
              METRICBEAT_INSTRUCTIONS.START.RPM,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.WINDOWS,
              METRICBEAT_ENABLE_INSTRUCTIONS.WINDOWS,
              METRICBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: metricbeatStatusCheck(moduleName),
      },
    ],
  };
}
