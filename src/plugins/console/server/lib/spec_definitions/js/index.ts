/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SpecDefinitionsService } from '../../../services';

import { aggs } from './aggregations';
import { aliases } from './aliases';
import { document } from './document';
import { filter } from './filter';
import { globals } from './globals';
import { ingest } from './ingest';
import { mappings } from './mappings';
import { settings } from './settings';
import { query } from './query';
import { reindex } from './reindex';
import { search } from './search';

export const jsSpecLoaders: Array<(registry: SpecDefinitionsService) => void> = [
  aggs,
  aliases,
  document,
  filter,
  globals,
  ingest,
  mappings,
  settings,
  query,
  reindex,
  search,
];
