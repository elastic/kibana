/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { i18n } from '@kbn/i18n';
import { getSavedObjects } from './saved_objects';
import { fieldMappings } from './field_mappings';
import { SampleDatasetSchema } from '../../lib/sample_dataset_registry_types';

const ecommerceName = i18n.translate('home.sampleData.ecommerceSpecTitle', {
  defaultMessage: 'Sample eCommerce orders',
});
const ecommerceDescription = i18n.translate('home.sampleData.ecommerceSpecDescription', {
  defaultMessage: 'Sample data, visualizations, and dashboards for tracking eCommerce orders.',
});

export const ecommerceSpecProvider = function (): SampleDatasetSchema {
  return {
    id: 'ecommerce',
    name: ecommerceName,
    description: ecommerceDescription,
    previewImagePath: '/plugins/home/assets/sample_data_resources/ecommerce/dashboard.png',
    darkPreviewImagePath: '/plugins/home/assets/sample_data_resources/ecommerce/dashboard_dark.png',
    overviewDashboard: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
    defaultIndex: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    savedObjects: getSavedObjects(),
    dataIndices: [
      {
        id: 'ecommerce',
        dataPath: path.join(__dirname, './ecommerce.json.gz'),
        fields: fieldMappings,
        timeFields: ['order_date'],
        currentTimeMarker: '2016-12-11T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
      },
    ],
    status: 'not_installed',
    iconPath: '/plugins/home/assets/sample_data_resources/ecommerce/icon.svg',
  };
};
