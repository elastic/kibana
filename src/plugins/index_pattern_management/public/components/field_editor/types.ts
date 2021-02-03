/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ReactText } from 'react';
import { Query } from 'src/plugins/data/public';
import { HttpStart } from 'src/core/public';

export interface Sample {
  input: ReactText | ReactText[];
  output: string;
}

export interface ExecuteScriptParams {
  name: string;
  script: string;
  indexPatternTitle: string;
  query?: Query['query'];
  additionalFields?: string[];
  http: HttpStart;
}

export interface ExecuteScriptResult {
  status: number;
  hits?: { hits: any[] };
  error?: any;
}

export type ExecuteScript = (params: ExecuteScriptParams) => Promise<ExecuteScriptResult>;
