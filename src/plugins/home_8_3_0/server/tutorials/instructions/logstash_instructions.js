"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createLogstashInstructions = void 0;

var _i18n = require("@kbn/i18n");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const createLogstashInstructions = () => ({
  INSTALL: {
    OSX: [{
      title: _i18n.i18n.translate('home.tutorials.common.logstashInstructions.install.java.osxTitle', {
        defaultMessage: 'Download and install the Java Runtime Environment'
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.logstashInstructions.install.java.osxTextPre', {
        defaultMessage: 'Follow the installation instructions [here]({link}).',
        values: {
          link: 'https://docs.oracle.com/javase/8/docs/technotes/guides/install/mac_jre.html'
        }
      })
    }, {
      title: _i18n.i18n.translate('home.tutorials.common.logstashInstructions.install.logstash.osxTitle', {
        defaultMessage: 'Download and install Logstash'
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.logstashInstructions.install.logstash.osxTextPre', {
        defaultMessage: 'First time using Logstash?  See the [Getting Started Guide]({link}).',
        values: {
          link: '{config.docs.base_url}guide/en/logstash/current/getting-started-with-logstash.html'
        }
      }),
      commands: ['curl -L -O https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.tar.gz', 'tar xzvf logstash-{config.kibana.version}.tar.gz']
    }],
    WINDOWS: [{
      title: _i18n.i18n.translate('home.tutorials.common.logstashInstructions.install.java.windowsTitle', {
        defaultMessage: 'Download and install the Java Runtime Environment'
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.logstashInstructions.install.java.windowsTextPre', {
        defaultMessage: 'Follow the installation instructions [here]({link}).',
        values: {
          link: 'https://docs.oracle.com/javase/8/docs/technotes/guides/install/windows_jre_install.html'
        }
      })
    }, {
      title: _i18n.i18n.translate('home.tutorials.common.logstashInstructions.install.logstash.windowsTitle', {
        defaultMessage: 'Download and install Logstash'
      }),
      textPre: _i18n.i18n.translate('home.tutorials.common.logstashInstructions.install.logstash.windowsTextPre', {
        defaultMessage: 'First time using Logstash?  See the [Getting Started Guide]({logstashLink}).\n\
 1. [Download]({elasticLink}) the Logstash Windows zip file.\n\
 2. Extract the contents of the zip file.',
        values: {
          logstashLink: '{config.docs.base_url}guide/en/logstash/current/getting-started-with-logstash.html',
          elasticLink: 'https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.zip'
        }
      })
    }]
  }
});

exports.createLogstashInstructions = createLogstashInstructions;