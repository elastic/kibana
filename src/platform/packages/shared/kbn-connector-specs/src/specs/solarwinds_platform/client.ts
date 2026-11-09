/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosError } from 'axios';
import type { ActionContext } from '../../connector_spec';

const SWIS_JSON_PATH = '/SolarWinds/InformationService/v3/Json';

interface SwisQueryResponse<T> {
  results: T[];
  totalRows?: number;
}

interface SwisErrorBody {
  Message?: string;
}

const getSwisUrl = (ctx: ActionContext): string => {
  const url = ((ctx.config?.url as string | undefined) ?? '').trim();
  if (!url) {
    throw new Error('SolarWinds connector is missing the required URL configuration field.');
  }
  return `${url.replace(/\/+$/, '')}${SWIS_JSON_PATH}`;
};

const formatSwisError = (operation: string, error: unknown): Error => {
  const err = error as AxiosError<SwisErrorBody | string>;
  const status = err.response?.status;
  const body = err.response?.data;
  const detail = (typeof body === 'object' ? body?.Message : body) || err.message;
  if (status === 401) {
    return new Error(
      `SolarWinds ${operation} failed (status 401): the username or password was rejected.`
    );
  }
  return new Error(`SolarWinds ${operation} failed (status ${status ?? 'unknown'}): ${detail}`);
};

/** Runs a SWQL query through `POST /Query`, passing values as named `@parameters`. */
export const swisQuery = async <T>(
  ctx: ActionContext,
  query: string,
  parameters: Record<string, unknown> = {}
): Promise<SwisQueryResponse<T>> => {
  const swisUrl = getSwisUrl(ctx);
  try {
    const response = await ctx.client.post<SwisQueryResponse<T>>(`${swisUrl}/Query`, {
      query,
      parameters,
    });
    return response.data;
  } catch (error) {
    throw formatSwisError('query', error);
  }
};

/** Invokes a SWIS verb. SWIS verb arguments are positional, so `args` is sent as a JSON array. */
export const swisInvoke = async <T>(
  ctx: ActionContext,
  entity: string,
  verb: string,
  args: unknown[]
): Promise<T> => {
  const swisUrl = getSwisUrl(ctx);
  try {
    const response = await ctx.client.post<T>(`${swisUrl}/Invoke/${entity}/${verb}`, args);
    return response.data;
  } catch (error) {
    throw formatSwisError(`${entity}.${verb}`, error);
  }
};

/** Reads one SWIS object by its `swis://` URI. */
export const swisRead = async <T>(ctx: ActionContext, uri: string): Promise<T> => {
  const swisUrl = getSwisUrl(ctx);
  try {
    const response = await ctx.client.get<T>(`${swisUrl}/${encodeURI(uri)}`);
    return response.data;
  } catch (error) {
    throw formatSwisError('read', error);
  }
};
