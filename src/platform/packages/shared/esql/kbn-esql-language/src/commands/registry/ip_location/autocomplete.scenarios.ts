/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScenarioTable } from '../../../__tests__/scenarios';

export const ipLocationScenarios: ScenarioTable = {
  command: 'ip_location',
  scenarios: [
    {
      name: 'suggests target field after command keyword',
      query: 'FROM a | IP_LOCATION ',
      expect: { contains: ['col0 = '] },
    },
    {
      name: 'suggests assignment operator after target field',
      query: 'FROM a | IP_LOCATION geo ',
      expect: { contains: ['= '] },
    },
    {
      name: 'suggests IP and string fields after the assignment operator',
      query: 'FROM a | IP_LOCATION geo = ',
      expect: { contains: ['ipField ', 'keywordField '] },
    },
    {
      name: 'suggests WITH and pipe after a complete expression',
      query: 'FROM a | IP_LOCATION geo = ipField',
      expect: { contains: ['WITH { $0 }', '| '] },
    },
    {
      name: 'suggests map keys inside an empty options map',
      query: 'FROM a | IP_LOCATION geo = ipField WITH { ',
      expect: { contains: ['"database_file": "$0"', '"first_only": ', '"properties": [ $0 ]'] },
    },
    {
      name: 'suggests properties for the selected database file',
      query:
        'FROM a | IP_LOCATION geo = ipField WITH { "database_file": "GeoLite2-Country.mmdb", "properties": [ ',
      expect: {
        contains: ['"continent_name"', '"country_iso_code"', '"country_name"'],
        excludes: ['"location"'],
      },
    },
    {
      name: 'suggests remaining property values after one is already selected',
      query: 'FROM a | IP_LOCATION geo = ipField WITH { "properties": ["city_name", ',
      expect: {
        contains: ['"country_name"', '"location"', '"region_name"'],
        excludes: ['"city_name"'],
      },
    },
  ],
};
