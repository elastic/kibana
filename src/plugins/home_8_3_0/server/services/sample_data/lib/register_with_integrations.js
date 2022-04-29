"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerSampleDatasetWithIntegration = registerSampleDatasetWithIntegration;

var _i18n = require("@kbn/i18n");

var _constants = require("../../../../common/constants");

var _logs = require("../data_sets/logs");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function registerSampleDatasetWithIntegration(customIntegrations, core) {
  customIntegrations.registerCustomIntegration({
    id: 'sample_data_all',
    title: _i18n.i18n.translate('home.sampleData.customIntegrationsTitle', {
      defaultMessage: 'Sample Data'
    }),
    description: _i18n.i18n.translate('home.sampleData.customIntegrationsDescription', {
      defaultMessage: 'Explore data in Kibana with these one-click data sets.'
    }),
    uiInternalPath: `${_constants.HOME_APP_BASE_PATH}#/tutorial_directory/sampleData`,
    isBeta: false,
    icons: [{
      type: 'svg',
      src: core.http.basePath.prepend(_logs.GLOBE_ICON_PATH)
    }],
    categories: ['sample_data'],
    shipper: 'sample_data'
  });
}