/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactText } from 'react';
import { Query } from '@kbn/es-query';
import { HttpStart } from 'src/core/public';

export type SampleInput = ReactText | ReactText[] | Record<string, ReactText | ReactText[]>;
export interface Sample {
  input: SampleInput;
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
