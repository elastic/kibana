/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { EsqlSource } from '@kbn/data-source';
import { getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';
import type { ESQLControlVariable } from '@kbn/esql-types';

export async function createEsqlSource({
  esql,
  http,
  projectRoutingFallback,
  timeRange,
  esqlVariables,
  timeFieldName,
}: {
  esql: string;
  http?: HttpStart;
  projectRoutingFallback?: string;
  timeRange?: { from: string; to: string };
  esqlVariables?: ESQLControlVariable[];
  timeFieldName?: string;
}): Promise<EsqlSource> {
  const projectRouting =
    getProjectRoutingFromEsqlQuery(esql) ?? projectRoutingFallback ?? undefined;
  return EsqlSource.create({
    query: esql,
    projectRouting,
    http,
    timeRange,
    esqlVariables,
    timeFieldName,
  });
}
