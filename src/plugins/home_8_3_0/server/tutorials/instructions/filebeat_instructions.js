"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cloudInstructions = cloudInstructions;
exports.createFilebeatInstructions = exports.createFilebeatCloudInstructions = void 0;
exports.filebeatEnableInstructions = filebeatEnableInstructions;
exports.filebeatStatusCheck = filebeatStatusCheck;
exports.onPremCloudInstructions = onPremCloudInstructions;
exports.onPremInstructions = onPremInstructions;

var _i18n = require("@kbn/i18n");

var _instruction_variant = require("../../../common/instruction_variant");

var _onprem_cloud_instructions = require("./onprem_cloud_instructions");

var _get_space_id_for_beats_tutorial = require("./get_space_id_for_beats_tutorial");

var _cloud_instructions = require("./cloud_instructions");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const createFilebeatInstructions = context => {
  const SSL_DOC_URL = `https://www.elastic.co/guide/en/beats/filebeat/${context.kibanaBranch}/configuration-ssl.html#ca-sha256`;
  return {
    INSTALL: {
      OSX: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.osxTitle', {
          defaultMessage: 'Download and install Filebeat'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.osxTextPre', {
          defaultMessage: 'First time using Filebeat? See the [Quick Start]({linkUrl}).',
          values: {
            linkUrl: '{config.docs.beats.filebeat}/filebeat-installation-configuration.html'
          }
        }),
        commands: ['curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-darwin-x86_64.tar.gz', 'tar xzvf filebeat-{config.kibana.version}-darwin-x86_64.tar.gz', 'cd filebeat-{config.kibana.version}-darwin-x86_64/']
      },
      DEB: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.debTitle', {
          defaultMessage: 'Download and install Filebeat'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.debTextPre', {
          defaultMessage: 'First time using Filebeat? See the [Quick Start]({linkUrl}).',
          values: {
            linkUrl: '{config.docs.beats.filebeat}/filebeat-installation-configuration.html'
          }
        }),
        commands: ['curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-amd64.deb', 'sudo dpkg -i filebeat-{config.kibana.version}-amd64.deb'],
        textPost: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.debTextPost', {
          defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({linkUrl}).',
          values: {
            linkUrl: 'https://www.elastic.co/downloads/beats/filebeat'
          }
        })
      },
      RPM: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.rpmTitle', {
          defaultMessage: 'Download and install Filebeat'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.rpmTextPre', {
          defaultMessage: 'First time using Filebeat? See the [Quick Start]({linkUrl}).',
          values: {
            linkUrl: '{config.docs.beats.filebeat}/filebeat-installation-configuration.html'
          }
        }),
        commands: ['curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-x86_64.rpm', 'sudo rpm -vi filebeat-{config.kibana.version}-x86_64.rpm'],
        textPost: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.rpmTextPost', {
          defaultMessage: 'Looking for the 32-bit packages? See the [Download page]({linkUrl}).',
          values: {
            linkUrl: 'https://www.elastic.co/downloads/beats/filebeat'
          }
        })
      },
      WINDOWS: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.windowsTitle', {
          defaultMessage: 'Download and install Filebeat'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.windowsTextPre', {
          defaultMessage: 'First time using Filebeat? See the [Quick Start]({guideLinkUrl}).\n\
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
            directoryName: 'filebeat-{config.kibana.version}-windows'
          }
        }),
        commands: ['cd "C:\\Program Files\\Filebeat"', '.\\install-service-filebeat.ps1'],
        textPost: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.install.windowsTextPost', {
          defaultMessage: 'Modify the settings under {propertyName} in the {filebeatPath} file to point to your Elasticsearch installation.',
          values: {
            propertyName: '`output.elasticsearch`',
            filebeatPath: '`C:\\Program Files\\Filebeat\\filebeat.yml`'
          }
        })
      }
    },
    START: {
      OSX: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.start.osxTitle', {
          defaultMessage: 'Start Filebeat'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.start.osxTextPre', {
          defaultMessage: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.'
        }),
        commands: ['./filebeat setup', './filebeat -e']
      },
      DEB: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.start.debTitle', {
          defaultMessage: 'Start Filebeat'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.start.debTextPre', {
          defaultMessage: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.'
        }),
        commands: ['sudo filebeat setup', 'sudo service filebeat start']
      },
      RPM: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.start.rpmTitle', {
          defaultMessage: 'Start Filebeat'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.start.rpmTextPre', {
          defaultMessage: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.'
        }),
        commands: ['sudo filebeat setup', 'sudo service filebeat start']
      },
      WINDOWS: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.start.windowsTitle', {
          defaultMessage: 'Start Filebeat'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.start.windowsTextPre', {
          defaultMessage: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, omit this command.'
        }),
        commands: ['.\\filebeat.exe setup', 'Start-Service filebeat']
      }
    },
    CONFIG: {
      OSX: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.osxTitle', {
          defaultMessage: 'Edit the configuration'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.osxTextPre', {
          defaultMessage: 'Modify {path} to set the connection information:',
          values: {
            path: '`filebeat.yml`'
          }
        }),
        commands: ['output.elasticsearch:', '  hosts: ["<es_url>"]', '  username: "elastic"', '  password: "<password>"', "  # If using Elasticsearch's default certificate", '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"', 'setup.kibana:', '  host: "<kibana_url>"', (0, _get_space_id_for_beats_tutorial.getSpaceIdForBeatsTutorial)(context)],
        textPost: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.osxTextPostMarkdown', {
          defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
              Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
              default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.',
          values: {
            passwordTemplate: '`<password>`',
            esUrlTemplate: '`<es_url>`',
            kibanaUrlTemplate: '`<kibana_url>`',
            configureSslUrl: SSL_DOC_URL,
            esCertFingerprintTemplate: '`<es cert fingerprint>`'
          }
        })
      },
      DEB: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.debTitle', {
          defaultMessage: 'Edit the configuration'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.debTextPre', {
          defaultMessage: 'Modify {path} to set the connection information:',
          values: {
            path: '`/etc/filebeat/filebeat.yml`'
          }
        }),
        commands: ['output.elasticsearch:', '  hosts: ["<es_url>"]', '  username: "elastic"', '  password: "<password>"', "  # If using Elasticsearch's default certificate", '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"', 'setup.kibana:', '  host: "<kibana_url>"', (0, _get_space_id_for_beats_tutorial.getSpaceIdForBeatsTutorial)(context)],
        textPost: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.debTextPostMarkdown', {
          defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
            Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
            default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.',
          values: {
            passwordTemplate: '`<password>`',
            esUrlTemplate: '`<es_url>`',
            kibanaUrlTemplate: '`<kibana_url>`',
            configureSslUrl: SSL_DOC_URL,
            esCertFingerprintTemplate: '`<es cert fingerprint>`'
          }
        })
      },
      RPM: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.rpmTitle', {
          defaultMessage: 'Edit the configuration'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.rpmTextPre', {
          defaultMessage: 'Modify {path} to set the connection information:',
          values: {
            path: '`/etc/filebeat/filebeat.yml`'
          }
        }),
        commands: ['output.elasticsearch:', '  hosts: ["<es_url>"]', '  username: "elastic"', '  password: "<password>"', "  # If using Elasticsearch's default certificate", '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"', 'setup.kibana:', '  host: "<kibana_url>"', (0, _get_space_id_for_beats_tutorial.getSpaceIdForBeatsTutorial)(context)],
        textPost: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.rpmTextPostMarkdown', {
          defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
            Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
            default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.',
          values: {
            passwordTemplate: '`<password>`',
            esUrlTemplate: '`<es_url>`',
            kibanaUrlTemplate: '`<kibana_url>`',
            configureSslUrl: SSL_DOC_URL,
            esCertFingerprintTemplate: '`<es cert fingerprint>`'
          }
        })
      },
      WINDOWS: {
        title: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.windowsTitle', {
          defaultMessage: 'Edit the configuration'
        }),
        textPre: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.windowsTextPre', {
          defaultMessage: 'Modify {path} to set the connection information:',
          values: {
            path: '`C:\\Program Files\\Filebeat\\filebeat.yml`'
          }
        }),
        commands: ['output.elasticsearch:', '  hosts: ["<es_url>"]', '  username: "elastic"', '  password: "<password>"', "  # If using Elasticsearch's default certificate", '  ssl.ca_trusted_fingerprint: "<es cert fingerprint>"', 'setup.kibana:', '  host: "<kibana_url>"', (0, _get_space_id_for_beats_tutorial.getSpaceIdForBeatsTutorial)(context)],
        textPost: _i18n.i18n.translate('home.tutorials.common.filebeatInstructions.config.windowsTextPostMarkdown', {
          defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user, {esUrlTemplate} is the URL of \
            Elasticsearch, and {kibanaUrlTemplate} is the URL of Kibana. To [configure SSL]({configureSslUrl}) with the \
            default certificate generated by Elasticsearch, add its fingerprint in {esCertFingerprintTemplate}.',
          values: {
            passwordTemplate: '`<password>`',
            esUrlTemplate: '`<es_url>`',
            kibanaUrlTemplate: '`<kibana_url>`',
            configureSslUrl: SSL_DOC_URL,
            esCertFingerprintTemplate: '`<es cert fingerprint>`'
          }
        })
      }
    }
  };
};

exports.createFilebeatInstructions = createFilebeatInstructions;

const createFilebeatCloudInstructions = () => ({
  CONFIG: {
    OSX: {
      title: _i18n.i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.osxTitle', {
        defaultMessage: 'Edit the configuration'
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.osxTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`filebeat.yml`'
        }
      }),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: _cloud_instructions.cloudPasswordAndResetLink
    },
    DEB: {
      title: _i18n.i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.debTitle', {
        defaultMessage: 'Edit the configuration'
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.debTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`/etc/filebeat/filebeat.yml`'
        }
      }),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: _cloud_instructions.cloudPasswordAndResetLink
    },
    RPM: {
      title: _i18n.i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.rpmTitle', {
        defaultMessage: 'Edit the configuration'
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.rpmTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`/etc/filebeat/filebeat.yml`'
        }
      }),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: _cloud_instructions.cloudPasswordAndResetLink
    },
    WINDOWS: {
      title: _i18n.i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.windowsTitle', {
        defaultMessage: 'Edit the configuration'
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.filebeatCloudInstructions.config.windowsTextPre', {
        defaultMessage: 'Modify {path} to set the connection information for Elastic Cloud:',
        values: {
          path: '`C:\\Program Files\\Filebeat\\filebeat.yml`'
        }
      }),
      commands: ['cloud.id: "{config.cloud.id}"', 'cloud.auth: "elastic:<password>"'],
      textPost: _cloud_instructions.cloudPasswordAndResetLink
    }
  }
});

exports.createFilebeatCloudInstructions = createFilebeatCloudInstructions;

function filebeatEnableInstructions(moduleName) {
  return {
    OSX: {
      title: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.osxTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: {
          moduleName
        }
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.osxTextPre', {
        defaultMessage: 'From the installation directory, run:'
      }),
      commands: ['./filebeat modules enable ' + moduleName],
      textPost: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.osxTextPost', {
        defaultMessage: 'Modify the settings in the `modules.d/{moduleName}.yml` file.',
        values: {
          moduleName
        }
      })
    },
    DEB: {
      title: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.debTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: {
          moduleName
        }
      }),
      commands: ['sudo filebeat modules enable ' + moduleName],
      textPost: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.debTextPost', {
        defaultMessage: 'Modify the settings in the `/etc/filebeat/modules.d/{moduleName}.yml` file.',
        values: {
          moduleName
        }
      })
    },
    RPM: {
      title: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.rpmTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: {
          moduleName
        }
      }),
      commands: ['sudo filebeat modules enable ' + moduleName],
      textPost: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.rpmTextPost', {
        defaultMessage: 'Modify the settings in the `/etc/filebeat/modules.d/{moduleName}.yml` file.',
        values: {
          moduleName
        }
      })
    },
    WINDOWS: {
      title: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.windowsTitle', {
        defaultMessage: 'Enable and configure the {moduleName} module',
        values: {
          moduleName
        }
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.windowsTextPre', {
        defaultMessage: 'From the {path} folder, run:',
        values: {
          path: `C:\\Program Files\\Filebeat`
        }
      }),
      commands: ['filebeat.exe modules enable ' + moduleName],
      textPost: _i18n.i18n.translate('home.tutorials.common.filebeatEnableInstructions.windowsTextPost', {
        defaultMessage: 'Modify the settings in the `modules.d/{moduleName}.yml` file.',
        values: {
          moduleName
        }
      })
    }
  };
}

function filebeatStatusCheck(moduleName) {
  return {
    title: _i18n.i18n.translate('home.tutorials.common.filebeatStatusCheck.title', {
      defaultMessage: 'Module status'
    }),
    text: _i18n.i18n.translate('home.tutorials.common.filebeatStatusCheck.text', {
      defaultMessage: 'Check that data is received from the Filebeat `{moduleName}` module',
      values: {
        moduleName
      }
    }),
    btnLabel: _i18n.i18n.translate('home.tutorials.common.filebeatStatusCheck.buttonLabel', {
      defaultMessage: 'Check data'
    }),
    success: _i18n.i18n.translate('home.tutorials.common.filebeatStatusCheck.successText', {
      defaultMessage: 'Data successfully received from this module'
    }),
    error: _i18n.i18n.translate('home.tutorials.common.filebeatStatusCheck.errorText', {
      defaultMessage: 'No data has been received from this module yet'
    }),
    esHitsCheck: {
      index: 'filebeat-*',
      query: {
        bool: {
          filter: {
            term: {
              'event.module': moduleName
            }
          }
        }
      }
    }
  };
}

function onPremInstructions(moduleName, platforms = [], context) {
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
      id: _instruction_variant.INSTRUCTION_VARIANT[platform],
      instructions
    });
  }

  return {
    instructionSets: [{
      title: _i18n.i18n.translate('home.tutorials.common.filebeat.premInstructions.gettingStarted.title', {
        defaultMessage: 'Getting Started'
      }),
      instructionVariants: variants,
      statusCheck: filebeatStatusCheck(moduleName)
    }]
  };
}

function onPremCloudInstructions(moduleName, platforms = [], context) {
  const FILEBEAT_INSTRUCTIONS = createFilebeatInstructions(context);
  const TRYCLOUD_OPTION1 = (0, _onprem_cloud_instructions.createTrycloudOption1)();
  const TRYCLOUD_OPTION2 = (0, _onprem_cloud_instructions.createTrycloudOption2)();
  const variants = [];

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    variants.push({
      id: _instruction_variant.INSTRUCTION_VARIANT[platform],
      instructions: [TRYCLOUD_OPTION1, TRYCLOUD_OPTION2, FILEBEAT_INSTRUCTIONS.INSTALL[platform], FILEBEAT_INSTRUCTIONS.CONFIG[platform], filebeatEnableInstructions(moduleName)[platform], FILEBEAT_INSTRUCTIONS.START[platform]]
    });
  }

  return {
    instructionSets: [{
      title: _i18n.i18n.translate('home.tutorials.common.filebeat.premCloudInstructions.gettingStarted.title', {
        defaultMessage: 'Getting Started'
      }),
      instructionVariants: variants,
      statusCheck: filebeatStatusCheck(moduleName)
    }]
  };
}

function cloudInstructions(moduleName, platforms = [], context) {
  const FILEBEAT_INSTRUCTIONS = createFilebeatInstructions(context);
  const FILEBEAT_CLOUD_INSTRUCTIONS = createFilebeatCloudInstructions();
  const variants = [];

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    variants.push({
      id: _instruction_variant.INSTRUCTION_VARIANT[platform],
      instructions: [FILEBEAT_INSTRUCTIONS.INSTALL[platform], FILEBEAT_CLOUD_INSTRUCTIONS.CONFIG[platform], filebeatEnableInstructions(moduleName)[platform], FILEBEAT_INSTRUCTIONS.START[platform]]
    });
  }

  return {
    instructionSets: [{
      title: _i18n.i18n.translate('home.tutorials.common.filebeat.cloudInstructions.gettingStarted.title', {
        defaultMessage: 'Getting Started'
      }),
      instructionVariants: variants,
      statusCheck: filebeatStatusCheck(moduleName)
    }]
  };
}