/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';

/**
 * The CloudWatch (metrics & alarms) API is signed under the "monitoring" SigV4
 * service name, and supports a JSON wire protocol (in addition to the legacy
 * Query/XML protocol) selected via the X-Amz-Target header. See
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/making-api-requests.html
 */
const CLOUDWATCH_TARGET_PREFIX = 'GraniteServiceVersion20100801';

/**
 * The CloudWatch Logs API uses the "AWS JSON 1.1" protocol, targeted via the
 * X-Amz-Target header. See
 * https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_Operations.html
 */
const CLOUDWATCH_LOGS_TARGET_PREFIX = 'Logs_20140328';

function getRegion(ctx: ActionContext): string {
  const { region } = ctx.config as { region?: string };
  if (!region) {
    throw new Error('Connector is missing the required "region" configuration field.');
  }
  return region;
}

/**
 * Extracts a readable error type/message from an AWS JSON-protocol error body,
 * e.g. `{ __type: "com.amazonaws.cloudwatch#ResourceNotFound", message: "..." }`.
 * Returns null if the body doesn't look like an AWS error.
 */
function readAwsErrorBody(data: unknown): { type?: string; message?: string } | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  // A malformed/misrouted request (e.g. missing a required protocol header)
  // can come back wrapped as `{ Output: { __type: "..." }, Version: "1.0" }`
  // instead of the usual flat `{ __type, message }` shape.
  const topLevel = data as Record<string, unknown>;
  const body = (topLevel.Output as Record<string, unknown> | undefined) ?? topLevel;
  const rawType = (body.__type as string) || (body.Type as string) || (body.code as string);
  const message =
    (body.message as string) || (body.Message as string) || (body.errorMessage as string);
  if (!rawType && !message) {
    return null;
  }
  const shortType = rawType?.includes('#') ? rawType.split('#').pop() : rawType;
  return { type: shortType, message };
}

/**
 * Some AWS CloudWatch JSON-protocol errors (e.g. a malformed or missing
 * Content-Encoding header) come back with an HTTP 200 status instead of a
 * 4xx, so axios never rejects. Detect that shape explicitly and throw, since
 * otherwise a failed call would silently be treated as a successful empty
 * response.
 */
function assertNotAwsErrorBody(serviceLabel: string, data: unknown): void {
  const awsError = readAwsErrorBody(data);
  if (awsError) {
    throw new Error(
      `${serviceLabel} error${awsError.type ? ` (${awsError.type})` : ''}: ${
        awsError.message || 'An unknown error occurred'
      }`
    );
  }
}

function createAwsError(serviceLabel: string, error: unknown): Error {
  const err = error as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };

  const awsError = readAwsErrorBody(err.response?.data);
  if (awsError) {
    return new Error(
      `${serviceLabel} error${awsError.type ? ` (${awsError.type})` : ''}: ${
        awsError.message || 'An unknown error occurred'
      }`
    );
  }

  if (err.response?.status === 401) {
    return new Error(
      `${serviceLabel} authentication failed. Please check your AWS Access Key ID and Secret Access Key.`
    );
  }
  if (err.response?.status === 403) {
    return new Error(
      `${serviceLabel} access denied. Your AWS IAM user lacks the required permissions for this operation.`
    );
  }

  return new Error(
    `${serviceLabel} request failed: ${err.response?.statusText || err.message || 'Unknown error'}`
  );
}

/**
 * Wraps a real HTTP/axios failure into a readable AWS error, but passes
 * through an error that was already formatted by `assertNotAwsErrorBody`
 * (identifiable by the lack of an axios `response` property) unchanged, to
 * avoid double-wrapping its message.
 */
function rethrowOrWrapAwsError(serviceLabel: string, error: unknown): Error {
  const hasAxiosResponse = Boolean((error as { response?: unknown } | undefined)?.response);
  if (error instanceof Error && !hasAxiosResponse) {
    return error;
  }
  return createAwsError(serviceLabel, error);
}

/**
 * Calls a CloudWatch (metrics & alarms) API action using the JSON wire protocol.
 * SigV4 signing is handled transparently by the aws_credentials auth interceptor.
 */
export async function callCloudWatchApi(
  ctx: ActionContext,
  action: string,
  body: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const region = getRegion(ctx);
  const url = `https://monitoring.${region}.amazonaws.com/`;

  try {
    const response = await ctx.client.post(url, JSON.stringify(body), {
      headers: {
        'X-Amz-Target': `${CLOUDWATCH_TARGET_PREFIX}.${action}`,
        // Required by the CloudWatch JSON wire protocol in addition to
        // Content-Type; without it the request is misrouted and CloudWatch
        // returns a 200 with an UnknownOperationException body instead of
        // executing the requested action. See "Making API Requests" in the
        // CloudWatch API reference.
        'Content-Encoding': 'amz-1.0',
      },
    });
    assertNotAwsErrorBody('AWS CloudWatch', response.data);
    return pascalKeysToCamel(response.data) as Record<string, unknown>;
  } catch (error: unknown) {
    throw rethrowOrWrapAwsError('AWS CloudWatch', error);
  }
}

/**
 * Calls GetMetricWidgetImage and returns the raw PNG bytes as a base64 string.
 * This action responds with a binary image body rather than JSON, so it needs
 * its own request with responseType: 'arraybuffer'.
 */
export async function callCloudWatchGetMetricWidgetImage(
  ctx: ActionContext,
  metricWidget: string
): Promise<Buffer> {
  const region = getRegion(ctx);
  const url = `https://monitoring.${region}.amazonaws.com/`;
  const body = JSON.stringify({ MetricWidget: metricWidget, OutputFormat: 'image/png' });

  try {
    const response = await ctx.client.post(url, body, {
      headers: {
        'X-Amz-Target': `${CLOUDWATCH_TARGET_PREFIX}.GetMetricWidgetImage`,
        'Content-Encoding': 'amz-1.0',
      },
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(response.data as ArrayBuffer);
    // An error response here is still JSON (not a PNG); detect it before
    // returning what would otherwise look like a (corrupt) image buffer.
    if (buffer.length > 0 && buffer[0] === '{'.charCodeAt(0)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(buffer.toString('utf-8'));
      } catch {
        parsed = undefined; // Not JSON after all — treat it as image bytes.
      }
      if (parsed !== undefined) {
        assertNotAwsErrorBody('AWS CloudWatch', parsed);
      }
    }
    if (buffer.length === 0) {
      throw new Error(
        'AWS CloudWatch returned an empty image. This can happen if the metricWidget JSON is malformed or references a metric/dimension combination CloudWatch could not render.'
      );
    }
    return buffer;
  } catch (error: unknown) {
    throw rethrowOrWrapAwsError('AWS CloudWatch', error);
  }
}

/**
 * Calls a CloudWatch Logs API action using its JSON wire protocol.
 * SigV4 signing is handled transparently by the aws_credentials auth interceptor.
 */
export async function callCloudWatchLogsApi(
  ctx: ActionContext,
  action: string,
  body: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const region = getRegion(ctx);
  const url = `https://logs.${region}.amazonaws.com/`;

  try {
    const response = await ctx.client.post(url, JSON.stringify(body), {
      headers: {
        'X-Amz-Target': `${CLOUDWATCH_LOGS_TARGET_PREFIX}.${action}`,
        // See the comment on the equivalent header in callCloudWatchApi —
        // CloudWatch Logs requires it too, or the request is misrouted.
        'Content-Encoding': 'amz-1.0',
      },
    });
    assertNotAwsErrorBody('AWS CloudWatch Logs', response.data);
    return response.data as Record<string, unknown>;
  } catch (error: unknown) {
    throw rethrowOrWrapAwsError('AWS CloudWatch Logs', error);
  }
}

/**
 * Converts a single PascalCase key to camelCase, acronym-aware: a leading
 * run of two or more uppercase letters is lowercased except its last
 * character (which starts the next capitalized word), e.g. "OKActions" ->
 * "okActions", not "oKActions". A single leading capital is just
 * lowercased, e.g. "AlarmName" -> "alarmName".
 */
function pascalKeyToCamel(key: string): string {
  if (key.length === 0) {
    return key;
  }
  let leadingUpperCount = 0;
  while (
    leadingUpperCount < key.length &&
    key[leadingUpperCount] >= 'A' &&
    key[leadingUpperCount] <= 'Z'
  ) {
    leadingUpperCount++;
  }
  if (leadingUpperCount === 0) {
    return key;
  }
  if (leadingUpperCount === key.length) {
    return key.toLowerCase();
  }
  if (leadingUpperCount === 1) {
    return key[0].toLowerCase() + key.slice(1);
  }
  return key.slice(0, leadingUpperCount - 1).toLowerCase() + key.slice(leadingUpperCount - 1);
}

/**
 * Recursively converts PascalCase object keys to camelCase.
 *
 * The CloudWatch (metrics & alarms) JSON protocol returns PascalCase field
 * names (e.g. "MetricAlarms", "StateValue"), unlike CloudWatch Logs which
 * already returns camelCase. Applying this to CloudWatch responses keeps the
 * connector's output consistently camelCase for agent/workflow consumers.
 */
export function pascalKeysToCamel(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(pascalKeysToCamel);
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      result[pascalKeyToCamel(key)] = pascalKeysToCamel(entryValue);
    }
    return result;
  }
  return value;
}

/** Converts an ISO 8601 timestamp string to Unix epoch seconds (used by the CloudWatch metrics/alarms and Logs Insights APIs). */
export function toEpochSeconds(isoTimestamp: string): number {
  const ms = Date.parse(isoTimestamp);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid timestamp: "${isoTimestamp}". Expected an ISO 8601 date string.`);
  }
  return Math.floor(ms / 1000);
}

/** Converts an ISO 8601 timestamp string to Unix epoch milliseconds (used by the CloudWatch Logs FilterLogEvents API). */
export function toEpochMillis(isoTimestamp: string): number {
  const ms = Date.parse(isoTimestamp);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid timestamp: "${isoTimestamp}". Expected an ISO 8601 date string.`);
  }
  return ms;
}
