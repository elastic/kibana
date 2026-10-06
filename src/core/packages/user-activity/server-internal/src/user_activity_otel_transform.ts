/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  OtelAppenderPluginConfig,
  OtelAttributesTransform,
  PluginAppenderConfigType,
} from '@kbn/core-logging-server';

/** Written onto the OTel resource AND used (via Object.keys) as the allowlist of resource keys to keep. */
export const USER_ACTIVITY_OTEL_RESOURCE_ATTRIBUTES: Record<string, string> = {
  'service.name': 'serverless-kibana',
  'service.type': 'kibana',
};

/** project.id would be dropped by the allowlist above, so it is copied onto every record instead. */
export const USER_ACTIVITY_OTEL_PROMOTE_RESOURCE_ATTRIBUTES: string[] = ['project.id'];

/** Shapes the flattened per-record attributes to the Serverless user activity requirements. */
export const applyUserActivityOtelFieldMap: OtelAttributesTransform = (attributes) => {
  const attrs = { ...attributes };

  attrs['log.type'] = 'user_activity';

  for (const key of [
    'message',
    'service.id',
    'service.node.roles',
    'service.state',
    'service.type',
    'service.version',
  ]) {
    delete attrs[key];
  }

  return attrs;
};

const shapeOtelAppender = (appender: OtelAppenderPluginConfig): OtelAppenderPluginConfig => ({
  ...appender,
  transformAttributes: applyUserActivityOtelFieldMap,
  includeResources: Object.keys(USER_ACTIVITY_OTEL_RESOURCE_ATTRIBUTES),
  promoteResourceAttributes: [
    ...(appender.promoteResourceAttributes ?? []),
    ...USER_ACTIVITY_OTEL_PROMOTE_RESOURCE_ATTRIBUTES,
  ],
  attributes: {
    ...appender.attributes,
    ...USER_ACTIVITY_OTEL_RESOURCE_ATTRIBUTES,
  },
});

/** Extends every `otel` appender with the Serverless shaping above; others pass through. */
export const shapeServerlessOtelAppenders = (
  appenders: ReadonlyMap<string, PluginAppenderConfigType>
): Map<string, PluginAppenderConfigType> =>
  new Map(
    [...appenders].map(([name, appender]): [string, PluginAppenderConfigType] =>
      appender.type === 'otel' ? [name, shapeOtelAppender(appender)] : [name, appender]
    )
  );
