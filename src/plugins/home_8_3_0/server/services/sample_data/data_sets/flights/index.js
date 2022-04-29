"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flightsSpecProvider = void 0;

var _path = _interopRequireDefault(require("path"));

var _i18n = require("@kbn/i18n");

var _saved_objects = require("./saved_objects");

var _field_mappings = require("./field_mappings");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const flightsName = _i18n.i18n.translate('home.sampleData.flightsSpecTitle', {
  defaultMessage: 'Sample flight data'
});

const flightsDescription = _i18n.i18n.translate('home.sampleData.flightsSpecDescription', {
  defaultMessage: 'Sample data, visualizations, and dashboards for monitoring flight routes.'
});

const flightsSpecProvider = function () {
  return {
    id: 'flights',
    name: flightsName,
    description: flightsDescription,
    previewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard.png',
    darkPreviewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard_dark.png',
    overviewDashboard: '7adfa750-4c81-11e8-b3d7-01146121b73d',
    defaultIndex: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
    savedObjects: (0, _saved_objects.getSavedObjects)(),
    dataIndices: [{
      id: 'flights',
      dataPath: _path.default.join(__dirname, './flights.json.gz'),
      fields: _field_mappings.fieldMappings,
      timeFields: ['timestamp'],
      currentTimeMarker: '2018-01-09T00:00:00',
      preserveDayOfWeekTimeOfDay: true
    }],
    status: 'not_installed',
    iconPath: '/plugins/home/assets/sample_data_resources/flights/icon.svg'
  };
};

exports.flightsSpecProvider = flightsSpecProvider;