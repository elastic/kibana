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
exports.createWinlogbeatInstructions = exports.createWinlogbeatCloudInstructions = void 0;
exports.onPremCloudInstructions = onPremCloudInstructions;
exports.onPremInstructions = onPremInstructions;
exports.winlogbeatStatusCheck = winlogbeatStatusCheck;

const _i18n = require('@kbn/i18n');

const _instruction_variant = require('../../../common/instruction_variant');

const _onprem_cloud_instructions = require('./onprem_cloud_instructions');

const _get_space_id_for_beats_tutorial = require('./get_space_id_for_beats_tutorial');

const _cloud_instructions = require('./cloud_instructions');

const createWinlogbeatInstructions = (context) => {
  const SSL_DOC_URL = `https://www.elastic.co/guide/en/beats/winlogbeat/${context.kibanaBranch}/configuration-ssl.html#ca-sha256`;
  return {
    INSTALL: {
      WINDOWS: {
        title: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeatInstructions.install.windowsTitle',
          {
            defaultMessage: 'Download and install Winlogbeat',
          }
        ),
        textPre: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeatInstructions.install.windowsTextPre',
          {
            defaultMessage:
              'First time using Winlogbeat? See the [Quick Start]({winlogbeatLink}).\n\
 1. Download the Winlogbeat Windows zip file from the [Download]({elasticLink}) page.\n\
 2. Extract the contents of the zip file into {folderPath}.\n\
 3. Rename the {directoryName} directory to `Winlogbeat`.\n\
 4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select \
**Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n\
 5. From the PowerShell prompt, run the following commands to install Winlogbeat as a Windows service.',
            values: {
              directoryName: '`winlogbeat-{config.kibana.version}-windows`',
              folderPath: '`C:\\Program Files`',
              winlogbeatLink:
                '{config.docs.beats.winlogbeat}/winlogbeat-installation-configuration.html',
              elasticLink: 'https://www.elastic.co/downloads/beats/winlogbeat',
            },
          }
        ),
        commands: ['cd "C:\\Program Files\\Winlogbeat"', '.\\install-service-winlogbeat.ps1'],
        textPost: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeatInstructions.install.windowsTextPost',
          {
            defaultMessage:
              'Modify the settings under `output.elasticsearch` in the {path} file to point to your Elasticsearch installation.',
            values: {
              path: '`C:\\Program Files\\Winlogbeat\\winlogbeat.yml`',
            },
          }
        ),
      },
    },
    START: {
      WINDOWS: {
        title: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeatInstructions.start.windowsTitle',
          {
            defaultMessage: 'Start Winlogbeat',
          }
        ),
        textPre: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeatInstructions.start.windowsTextPre',
          {
            defaultMessage:
              'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.',
          }
        ),
        commands: ['.\\winlogbeat.exe setup', 'Start-Service winlogbeat'],
      },
    },
    CONFIG: {
      WINDOWS: {
        title: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeatInstructions.config.windowsTitle',
          {
            defaultMessage: 'Edit the configuration',
          }
        ),
        textPre: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeatInstructions.config.windowsTextPre',
          {
            defaultMessage: 'Modify {path} to set the connection information:',
            values: {
              path: '`C:\\Program Files\\Winlogbeat\\winlogbeat.yml`',
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
          'home.tutorials.common.winlogbeatInstructions.config.windowsTextPostMarkdown',
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

exports.createWinlogbeatInstructions = createWinlogbeatInstructions;

const createWinlogbeatCloudInstructions = () => ({
  CONFIG: {
    WINDOWS: {
      title: _i18n.i18n.translate(
        'home.tutorials.common.winlogbeatCloudInstructions.config.windowsTitle',
        {
          defaultMessage: 'Edit the configuration',
        }
      ),
      textPre: _i18n.i18n.translate(
        'home.tutorials.common.winlogbeatCloudInstructions.config.windowsTextPre',
        {
          defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
          values: {
            path: '`C:\\Program Files\\Winlogbeat\\winlogbeat.yml`',
          },
        }
      ),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: _cloud_instructions.cloudPasswordAndResetLink,
    },
  },
});

exports.createWinlogbeatCloudInstructions = createWinlogbeatCloudInstructions;

function winlogbeatStatusCheck() {
  return {
    title: _i18n.i18n.translate('home.tutorials.common.winlogbeatStatusCheck.title', {
      defaultMessage: 'Module status',
    }),
    text: _i18n.i18n.translate('home.tutorials.common.winlogbeatStatusCheck.text', {
      defaultMessage: 'Check that data is received from Winlogbeat',
    }),
    btnLabel: _i18n.i18n.translate('home.tutorials.common.winlogbeatStatusCheck.buttonLabel', {
      defaultMessage: 'Check data',
    }),
    success: _i18n.i18n.translate('home.tutorials.common.winlogbeatStatusCheck.successText', {
      defaultMessage: 'Data successfully received',
    }),
    error: _i18n.i18n.translate('home.tutorials.common.winlogbeatStatusCheck.errorText', {
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

function onPremInstructions(context) {
  const WINLOGBEAT_INSTRUCTIONS = createWinlogbeatInstructions(context);
  return {
    instructionSets: [
      {
        title: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeat.premInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.WINDOWS,
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

function onPremCloudInstructions(context) {
  const TRYCLOUD_OPTION1 = (0, _onprem_cloud_instructions.createTrycloudOption1)();
  const TRYCLOUD_OPTION2 = (0, _onprem_cloud_instructions.createTrycloudOption2)();
  const WINLOGBEAT_INSTRUCTIONS = createWinlogbeatInstructions(context);
  return {
    instructionSets: [
      {
        title: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeat.premCloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.WINDOWS,
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

function cloudInstructions(context) {
  const WINLOGBEAT_INSTRUCTIONS = createWinlogbeatInstructions(context);
  const WINLOGBEAT_CLOUD_INSTRUCTIONS = createWinlogbeatCloudInstructions();
  return {
    instructionSets: [
      {
        title: _i18n.i18n.translate(
          'home.tutorials.common.winlogbeat.cloudInstructions.gettingStarted.title',
          {
            defaultMessage: 'Getting Started',
          }
        ),
        instructionVariants: [
          {
            id: _instruction_variant.INSTRUCTION_VARIANT.WINDOWS,
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
