/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import path from 'path';
import { i18n } from '@kbn/i18n';
import { getSavedObjects } from './saved_objects';
import { fieldMappings } from './field_mappings';
import { SampleDatasetSchema, AppLinkSchema } from '../../lib/sample_dataset_registry_types';

const flightsName = i18n.translate('home.sampleData.flightsSpecTitle', {
  defaultMessage: 'Sample flight data',
});
const flightsDescription = i18n.translate('home.sampleData.flightsSpecDescription', {
  defaultMessage: 'Sample data, visualizations, and dashboards for monitoring flight routes.',
});
const initialAppLinks = [] as AppLinkSchema[];

export const flightsSpecProvider = function(): SampleDatasetSchema {
  return {
    id: 'flights',
    name: flightsName,
    description: flightsDescription,
    previewImagePath: '/plugins/kibana/home/sample_data_resources/flights/dashboard.png',
    darkPreviewImagePath: '/plugins/kibana/home/sample_data_resources/flights/dashboard_dark.png',
    overviewDashboard: '7adfa750-4c81-11e8-b3d7-01146121b73d',
    appLinks: initialAppLinks,
    defaultIndex: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
    savedObjects: getSavedObjects(),
    dataIndices: [
      {
        id: 'flights',
        dataPath: path.join(__dirname, './flights.json.gz'),
        fields: fieldMappings,
        timeFields: ['timestamp'],
        currentTimeMarker: '2018-01-09T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
      },
    ],
    status: 'not_installed',
  };
};
