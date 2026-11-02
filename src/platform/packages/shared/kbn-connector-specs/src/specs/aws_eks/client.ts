/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';

/** Resolves the Region for a call: the per-call override, else the connector default. */
export const resolveRegion = (ctx: ActionContext, requested?: string): string => {
  const region = requested?.trim() || (ctx.config?.region as string | undefined)?.trim();
  if (!region) {
    throw new Error(
      'No AWS Region available: pass region (for example us-east-1) or set one on the connector.'
    );
  }
  return region;
};

export const eksBase = (region: string): string => `https://eks.${region}.amazonaws.com`;

export const clusterPath = (region: string, clusterName: string): string =>
  `${eksBase(region)}/clusters/${encodeURIComponent(clusterName)}`;

export const nodegroupPath = (region: string, clusterName: string, nodegroupName: string): string =>
  `${clusterPath(region, clusterName)}/node-groups/${encodeURIComponent(nodegroupName)}`;

export const accessEntryPath = (
  region: string,
  clusterName: string,
  principalArn: string
): string =>
  `${clusterPath(region, clusterName)}/access-entries/${encodeURIComponent(principalArn)}`;

/** Resolves the Region and the cluster URL for an action addressed by cluster name. */
export const resolveCluster = (
  ctx: ActionContext,
  input: { region?: string; clusterName: string }
): { region: string; url: string } => {
  const region = resolveRegion(ctx, input.region);
  return { region, url: clusterPath(region, input.clusterName) };
};

/**
 * Surface the EKS error type and message. REST-JSON errors carry the type in the
 * `x-amzn-ErrorType` header (`ResourceNotFoundException:http://…`) or a `__type` body field,
 * and the detail in `message`; an unwrapped axios error says only "status code 404".
 */
export const throwWithApiError = (error: unknown): never => {
  const axiosError = error as {
    response?: { status?: number; data?: unknown; headers?: Record<string, unknown> };
    message?: string;
  };
  const response = axiosError.response;
  if (!response) {
    throw error;
  }
  const body =
    typeof response.data === 'object' && response.data !== null
      ? (response.data as Record<string, unknown>)
      : {};
  const headerType = response.headers?.['x-amzn-errortype'];
  const rawType =
    (typeof headerType === 'string' ? headerType : undefined) ??
    (body.__type as string | undefined) ??
    (body.code as string | undefined);
  const type = rawType?.split(':')[0]?.split('#').pop();
  const message =
    (body.message as string | undefined) ??
    (body.Message as string | undefined) ??
    (typeof response.data === 'string' ? response.data : undefined) ??
    axiosError.message;
  throw new Error(
    `Amazon EKS API error (${response.status})${type ? ` [${type}]` : ''}: ${message}`
  );
};

/** Runs an EKS call and returns its body, rethrowing HTTP failures with the EKS error. */
export const request = async <T>(fn: () => Promise<{ data: unknown }>): Promise<T> => {
  try {
    return (await fn()).data as T;
  } catch (error) {
    return throwWithApiError(error);
  }
};

/** Reads the connector's static access key, which the token mint signs with. */
export const awsCredentials = (
  ctx: ActionContext
): { accessKeyId: string; secretAccessKey: string } => {
  const accessKeyId = ctx.secrets?.accessKeyId as string | undefined;
  const secretAccessKey = ctx.secrets?.secretAccessKey as string | undefined;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('The connector has no AWS access key configured; cannot mint a cluster token.');
  }
  return { accessKeyId, secretAccessKey };
};
