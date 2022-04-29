"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.elasticsearchLogsSpecProvider = elasticsearchLogsSpecProvider;

var _i18n = require("@kbn/i18n");

var _tutorials = require("../../services/tutorials");

var _filebeat_instructions = require("../instructions/filebeat_instructions");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function elasticsearchLogsSpecProvider(context) {
  const moduleName = 'elasticsearch';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'elasticsearchLogs',
    name: _i18n.i18n.translate('home.tutorials.elasticsearchLogs.nameTitle', {
      defaultMessage: 'Elasticsearch Logs'
    }),
    moduleName,
    category: _tutorials.TutorialsCategory.LOGGING,
    isBeta: true,
    shortDescription: _i18n.i18n.translate('home.tutorials.elasticsearchLogs.shortDescription', {
      defaultMessage: 'Collect and parse logs from Elasticsearch clusters with Filebeat.'
    }),
    longDescription: _i18n.i18n.translate('home.tutorials.elasticsearchLogs.longDescription', {
      defaultMessage: 'The `elasticsearch` Filebeat module parses logs created by Elasticsearch. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-elasticsearch.html'
      }
    }),
    euiIconType: 'logoElasticsearch',
    artifacts: {
      application: {
        label: _i18n.i18n.translate('home.tutorials.elasticsearchLogs.artifacts.application.label', {
          defaultMessage: 'Discover'
        }),
        path: '/app/discover#/'
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-elasticsearch.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/elasticsearch_logs/screenshot.png',
    onPrem: (0, _filebeat_instructions.onPremInstructions)(moduleName, platforms, context),
    elasticCloud: (0, _filebeat_instructions.cloudInstructions)(moduleName, platforms, context),
    onPremElasticCloud: (0, _filebeat_instructions.onPremCloudInstructions)(moduleName, platforms, context),
    integrationBrowserCategories: ['containers', 'os_system']
  };
}