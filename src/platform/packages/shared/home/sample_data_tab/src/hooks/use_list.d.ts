/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SampleDataSet } from '@kbn/home-sample-data-types';
/**
 * A React hook that fetches a list of Sample Data Sets from Kibana, as well as failure
 * indicators in the Kibana UI.  It also provides a boolean that indicates if the list is
 * currently being fetched, as well as a method to refresh the list on demand.
 */
export declare const useList: () => [SampleDataSet[], () => Promise<void>, boolean];
