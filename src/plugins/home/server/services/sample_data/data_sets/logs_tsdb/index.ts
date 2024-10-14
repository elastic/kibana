/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { i18n } from '@kbn/i18n';
import { getSavedObjects } from './saved_objects';
import { fieldMappings } from './field_mappings';
import { SampleDatasetProvider } from '../../lib/sample_dataset_registry_types';

const logsName = i18n.translate('home.sampleData.logsTsdbSpecTitle', {
  defaultMessage: 'Sample web logs (TSDB)',
});
const logsDescription = i18n.translate('home.sampleData.logsTsdbSpecDescription', {
  defaultMessage: 'Sample data, visualizations, and dashboards for monitoring web logs.',
});

export const GLOBE_ICON_PATH = '/plugins/home/assets/sample_data_resources/logs/icon.svg';
export const logsTSDBSpecProvider: SampleDatasetProvider = ({ staticAssets }) => {
  const startDate = new Date();
  const endDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  endDate.setMonth(endDate.getMonth() + 2);
  return {
    id: 'logstsdb',
    name: logsName,
    description: logsDescription,
    previewImagePath: staticAssets.getPluginAssetHref('/sample_data_resources/logs/dashboard.webp'),
    darkPreviewImagePath: staticAssets.getPluginAssetHref(
      '/sample_data_resources/logs/dashboard_dark.webp'
    ),
    overviewDashboard: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef8f5b',
    defaultIndex: '90943e30-9a47-11e8-b64d-95841ca0c247',
    savedObjects: getSavedObjects(),
    dataIndices: [
      {
        id: 'logstsdb',
        dataPath: path.join(__dirname, './logs.json.gz'),
        fields: fieldMappings,
        timeFields: ['@timestamp', 'utc_time'],
        currentTimeMarker: '2018-08-01T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
        indexSettings: {
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
          mode: 'time_series',
          routing_path: 'event.dataset',
          'time_series.start_time': startDate.toISOString(),
          'time_series.end_time': endDate.toISOString(),
        },
      },
    ],
    status: 'not_installed',
    iconPath: staticAssets.getPluginAssetHref('/sample_data_resources/logs/icon.svg'),
  };
};
