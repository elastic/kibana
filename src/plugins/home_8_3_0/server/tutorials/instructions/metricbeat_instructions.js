/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.cloudInstructions = cloudInstructions;
exports.createMetricbeatInstructions = exports.createMetricbeatCloudInstructions = void 0;
exports.metricbeatEnableInstructions = metricbeatEnableInstructions;
exports.metricbeatStatusCheck = metricbeatStatusCheck;
exports.onPremCloudInstructions = onPremCloudInstructions;
exports.onPremInstructions = onPremInstructions;

const _i18n = require('@kbn/i18n');

const _instruction_variant = require('../../../common/instruction_variant');

const _onprem_cloud_instructions = require('./onprem_cloud_instructions');

const _get_space_id_for_beats_tutorial = require('./get_space_id_for_beats_tutorial');

const _cloud_instructions = require('./cloud_instructions');

const createMetricbeatInstructions = (context) => {
  const SSL_DOC_URL = `https://www.elastic.co/guide/en/beats/metricbeat/${context.kibanaBranch}/configuration-ssl.html#ca-sha256`;
  return {
    INSTALL: {
      OSX: {
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.install.osxTitle',
          {
            defaultMessage: 'Download and install Metricbeat',
          }
        ),
        textPre: _i18n.i18n.translate(
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
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.install.debTitle',
          {
            defaultMessage: 'Download and install Metricbeat',
          }
        ),
        textPre: _i18n.i18n.translate(
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
        textPost: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.install.debTextPost',
          {
            defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({link}).',
            values: {
              link: 'https://www.elastic.co/downloads/beats/metricbeat',
            },
          }
        ),
      },
      RPM: {
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.install.rpmTitle',
          {
            defaultMessage: 'Download and install Metricbeat',
          }
        ),
        textPre: _i18n.i18n.translate(
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
        textPost: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.install.debTextPost',
          {
            defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({link}).',
            values: {
              link: 'https://www.elastic.co/downloads/beats/metricbeat',
            },
          }
        ),
      },
      WINDOWS: {
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.install.windowsTitle',
          {
            defaultMessage: 'Download and install Metricbeat',
          }
        ),
        textPre: _i18n.i18n.translate(
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
        textPost: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.install.windowsTextPost',
          {
            defaultMessage:
              'Modify the settings under `output.elasticsearch` in the {path} file to point to your Elasticsearch installation.',
            values: {
              path: '`C:\\Program Files\\Metricbeat\\metricbeat.yml`',
            },
          }
        ),
      },
    },
    START: {
      OSX: {
        title: _i18n.i18n.translate('home.tutorials.common.metricbeatInstructions.start.osxTitle', {
          defaultMessage: 'Start Metricbeat',
        }),
        textPre: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.start.osxTextPre',
          {
            defaultMessage:
              'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
          }
        ),
        commands: ['./metricbeat setup', './metricbeat -e'],
      },
      DEB: {
        title: _i18n.i18n.translate('home.tutorials.common.metricbeatInstructions.start.debTitle', {
          defaultMessage: 'Start Metricbeat',
        }),
        textPre: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.start.debTextPre',
          {
            defaultMessage:
              'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
          }
        ),
        commands: ['sudo metricbeat setup', 'sudo service metricbeat start'],
      },
      RPM: {
        title: _i18n.i18n.translate('home.tutorials.common.metricbeatInstructions.start.rpmTitle', {
          defaultMessage: 'Start Metricbeat',
        }),
        textPre: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.start.rpmTextPre',
          {
            defaultMessage:
              'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
          }
        ),
        commands: ['sudo metricbeat setup', 'sudo service metricbeat start'],
      },
      WINDOWS: {
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.start.windowsTitle',
          {
            defaultMessage: 'Start Metricbeat',
          }
        ),
        textPre: _i18n.i18n.translate(
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
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.config.osxTitle',
          {
            defaultMessage: 'Edit the configuration',
          }
        ),
        textPre: _i18n.i18n.translate(
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
          (0, _get_space_id_for_beats_tutorial.getSpaceIdForBeatsTutorial)(context),
        ],
        textPost: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.config.osxTextPostMarkdown',
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
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.config.debTitle',
          {
            defaultMessage: 'Edit the configuration',
          }
        ),
        textPre: _i18n.i18n.translate(
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
          (0, _get_space_id_for_beats_tutorial.getSpaceIdForBeatsTutorial)(context),
        ],
        textPost: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.config.debTextPostMarkdown',
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
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.config.rpmTitle',
          {
            defaultMessage: 'Edit the configuration',
          }
        ),
        textPre: _i18n.i18n.translate(
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
          (0, _get_space_id_for_beats_tutorial.getSpaceIdForBeatsTutorial)(context),
        ],
        textPost: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.config.rpmTextPostMarkdown',
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
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.config.windowsTitle',
          {
            defaultMessage: 'Edit the configuration',
          }
        ),
        textPre: _i18n.i18n.translate(
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
          (0, _get_space_id_for_beats_tutorial.getSpaceIdForBeatsTutorial)(context),
        ],
        textPost: _i18n.i18n.translate(
          'home.tutorials.common.metricbeatInstructions.config.windowsTextPostMarkdown',
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

exports.createMetricbeatInstructions = createMetricbeatInstructions;

const createMetricbeatCloudInstructions = () => ({
  CONFIG: {
    OSX: {
      title: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.osxTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.osxTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`metricbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: _cloud_instructions.cloudPasswordAndResetLink,
    },
    DEB: {
      title: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.debTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.debTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`/etc/metricbeat/metricbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: _cloud_instructions.cloudPasswordAndResetLink,
    },
    RPM: {
      title: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.rpmTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.rpmTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`/etc/metricbeat/metricbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: _cloud_instructions.cloudPasswordAndResetLink,
    },
    WINDOWS: {
      title: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.windowsTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatCloudInstructions.config.windowsTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`C:\\Program Files\\Metricbeat\\metricbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: _cloud_instructions.cloudPasswordAndResetLink,
    },
  },
});

exports.createMetricbeatCloudInstructions = createMetricbeatCloudInstructions;

function metricbeatEnableInstructions(moduleName) {
  return {
    OSX: {
      title: _i18n.i18n.translate('home.tutorials.common.metricbeatEnableInstructions.osxTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: {
          moduleName,
        },
      }),
      textPre: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatEnableInstructions.osxTextPre',
        {
          defaultMessage: 'From the installation directory, run:',
        }
      ),
      commands: ['./metricbeat modules enable ' + moduleName],
      textPost: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatEnableInstructions.osxTextPost',
        {
          defaultMessage: 'Modify the settings in the `modules.d/{moduleName}.yml` file.',
          values: {
            moduleName,
          },
        }
      ),
    },
    DEB: {
      title: _i18n.i18n.translate('home.tutorials.common.metricbeatEnableInstructions.debTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: {
          moduleName,
        },
      }),
      commands: ['sudo metricbeat modules enable ' + moduleName],
      textPost: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatEnableInstructions.debTextPost',
        {
          defaultMessage:
            'Modify the settings in the `/etc/metricbeat/modules.d/{moduleName}.yml` file.',
          values: {
            moduleName,
          },
        }
      ),
    },
    RPM: {
      title: _i18n.i18n.translate('home.tutorials.common.metricbeatEnableInstructions.rpmTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: {
          moduleName,
        },
      }),
      commands: ['sudo metricbeat modules enable ' + moduleName],
      textPost: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatEnableInstructions.rpmTextPost',
        {
          defaultMessage:
            'Modify the settings in the `/etc/metricbeat/modules.d/{moduleName}.yml` file.',
          values: {
            moduleName,
          },
        }
      ),
    },
    WINDOWS: {
      title: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatEnableInstructions.windowsTitle',
        {
          defaultMessage: 'Enable and configure the {moduleName} module',
          values: {
            moduleName,
          },
        }
      ),
      textPre: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatEnableInstructions.windowsTextPre',
        {
          defaultMessage: 'From the {path} folder, run:',
          values: {
            path: `C:\\Program Files\\Metricbeat`,
          },
        }
      ),
      commands: ['.\\metricbeat.exe modules enable ' + moduleName],
      textPost: _i18n.i18n.translate(
        'home.tutorials.common.metricbeatEnableInstructions.windowsTextPost',
        {
          defaultMessage: 'Modify the settings in the `modules.d/{moduleName}.yml` file.',
          values: {
            moduleName,
          },
        }
      ),
    },
  };
}

function metricbeatStatusCheck(moduleName) {
  return {
    title: _i18n.i18n.translate('home.tutorials.common.metricbeatStatusCheck.title', {
      defaultMessage: 'Module status',
    }),
    text: _i18n.i18n.translate('home.tutorials.common.metricbeatStatusCheck.text', {
      defaultMessage: 'Check that data is received from the Metricbeat `{moduleName}` module',
      values: {
        moduleName,
      },
    }),
    btnLabel: _i18n.i18n.translate('home.tutorials.common.metricbeatStatusCheck.buttonLabel', {
      defaultMessage: 'Check data',
    }),
    success: _i18n.i18n.translate('home.tutorials.common.metricbeatStatusCheck.successText', {
      defaultMessage: 'Data successfully received from this module',
    }),
    error: _i18n.i18n.translate('home.tutorials.common.metricbeatStatusCheck.errorText', {
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

function onPremInstructions(moduleName, context) {
  const METRICBEAT_INSTRUCTIONS = createMetricbeatInstructions(context);
  return {
    instructionSets: [
      {
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeat.premInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.OSX,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              METRICBEAT_INSTRUCTIONS.CONFIG.OSX,
              metricbeatEnableInstructions(moduleName).OSX,
              METRICBEAT_INSTRUCTIONS.START.OSX,
            ],
          },
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.DEB,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              METRICBEAT_INSTRUCTIONS.CONFIG.DEB,
              metricbeatEnableInstructions(moduleName).DEB,
              METRICBEAT_INSTRUCTIONS.START.DEB,
            ],
          },
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.RPM,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              METRICBEAT_INSTRUCTIONS.CONFIG.RPM,
              metricbeatEnableInstructions(moduleName).RPM,
              METRICBEAT_INSTRUCTIONS.START.RPM,
            ],
          },
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              METRICBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              metricbeatEnableInstructions(moduleName).WINDOWS,
              METRICBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: metricbeatStatusCheck(moduleName),
      },
    ],
  };
}

function onPremCloudInstructions(moduleName, context) {
  const TRYCLOUD_OPTION1 = (0, _onprem_cloud_instructions.createTrycloudOption1)();
  const TRYCLOUD_OPTION2 = (0, _onprem_cloud_instructions.createTrycloudOption2)();
  const METRICBEAT_INSTRUCTIONS = createMetricbeatInstructions(context);
  return {
    instructionSets: [
      {
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeat.premCloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.OSX,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              METRICBEAT_INSTRUCTIONS.CONFIG.OSX,
              metricbeatEnableInstructions(moduleName).OSX,
              METRICBEAT_INSTRUCTIONS.START.OSX,
            ],
          },
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.DEB,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              METRICBEAT_INSTRUCTIONS.CONFIG.DEB,
              metricbeatEnableInstructions(moduleName).DEB,
              METRICBEAT_INSTRUCTIONS.START.DEB,
            ],
          },
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.RPM,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              METRICBEAT_INSTRUCTIONS.CONFIG.RPM,
              metricbeatEnableInstructions(moduleName).RPM,
              METRICBEAT_INSTRUCTIONS.START.RPM,
            ],
          },
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              TRYCLOUD_OPTION1,
              TRYCLOUD_OPTION2,
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              METRICBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
              metricbeatEnableInstructions(moduleName).WINDOWS,
              METRICBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: metricbeatStatusCheck(moduleName),
      },
    ],
  };
}

function cloudInstructions(moduleName, context) {
  const METRICBEAT_INSTRUCTIONS = createMetricbeatInstructions(context);
  const METRICBEAT_CLOUD_INSTRUCTIONS = createMetricbeatCloudInstructions();
  return {
    instructionSets: [
      {
        title: _i18n.i18n.translate(
          'home.tutorials.common.metricbeat.cloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.OSX,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.OSX,
              metricbeatEnableInstructions(moduleName).OSX,
              METRICBEAT_INSTRUCTIONS.START.OSX,
            ],
          },
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.DEB,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.DEB,
              metricbeatEnableInstructions(moduleName).DEB,
              METRICBEAT_INSTRUCTIONS.START.DEB,
            ],
          },
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.RPM,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.RPM,
              metricbeatEnableInstructions(moduleName).RPM,
              METRICBEAT_INSTRUCTIONS.START.RPM,
            ],
          },
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.WINDOWS,
              metricbeatEnableInstructions(moduleName).WINDOWS,
              METRICBEAT_INSTRUCTIONS.START.WINDOWS,
            ],
          },
        ],
        statusCheck: metricbeatStatusCheck(moduleName),
      },
    ],
  };
}
