"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ecommerceSpecProvider = void 0;

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
const ecommerceName = _i18n.i18n.translate('home.sampleData.ecommerceSpecTitle', {
  defaultMessage: 'Sample eCommerce orders'
});

const ecommerceDescription = _i18n.i18n.translate('home.sampleData.ecommerceSpecDescription', {
  defaultMessage: 'Sample data, visualizations, and dashboards for tracking eCommerce orders.'
});

const ecommerceSpecProvider = function () {
  return {
    id: 'ecommerce',
    name: ecommerceName,
    description: ecommerceDescription,
    previewImagePath: '/plugins/home/assets/sample_data_resources/ecommerce/dashboard.png',
    darkPreviewImagePath: '/plugins/home/assets/sample_data_resources/ecommerce/dashboard_dark.png',
    overviewDashboard: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
    defaultIndex: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    savedObjects: (0, _saved_objects.getSavedObjects)(),
    dataIndices: [{
      id: 'ecommerce',
      dataPath: _path.default.join(__dirname, './ecommerce.json.gz'),
      fields: _field_mappings.fieldMappings,
      timeFields: ['order_date'],
      currentTimeMarker: '2016-12-11T00:00:00',
      preserveDayOfWeekTimeOfDay: true
    }],
    status: 'not_installed',
    iconPath: '/plugins/home/assets/sample_data_resources/ecommerce/icon.svg'
  };
};

exports.ecommerceSpecProvider = ecommerceSpecProvider;