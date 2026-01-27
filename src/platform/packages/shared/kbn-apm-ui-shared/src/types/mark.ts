/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Error } from '@kbn/apm-types';
export interface Mark {
  type: string;
  offset: number;
  verticalLine: boolean;
  id: string;
}

export interface AgentMark extends Mark {
  type: 'agentMark';
}

export interface ErrorMark extends Mark {
  type: 'errorMark';
  error: Error;
  serviceColor: string;
  onClick?: () => void;
  href?: string;
}
