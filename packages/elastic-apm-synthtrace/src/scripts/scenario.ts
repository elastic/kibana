/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchOutput } from '../lib/utils/to_elasticsearch_output';
import { RunOptions } from './utils/parse_run_cli_flags';

type Generate = (range: { from: number; to: number }) => ElasticsearchOutput[];
export type Scenario = (options: RunOptions) => Promise<{ generate: Generate }>;
