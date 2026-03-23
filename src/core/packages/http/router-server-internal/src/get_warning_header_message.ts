/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteDeprecationInfo } from '@kbn/core-http-server';

const MAX_HEADER_LENGTH = 1000;

export function getWarningHeaderMessageFromRouteDeprecation(
  deprecationObject: RouteDeprecationInfo,
  kibanaVersion: string
): string {
  const rawMsg = deprecationObject.message ?? 'This endpoint is deprecated';
  let encodedMsg = encodeURIComponent(rawMsg);

  const prefix = `299 Kibana-${kibanaVersion} "`;
  const suffix = `"`;
  const maxMsgLength = MAX_HEADER_LENGTH - prefix.length - suffix.length;

  if (encodedMsg.length > maxMsgLength) {
    encodedMsg = encodedMsg.substring(0, maxMsgLength - 3) + '...';
  }

  return `${prefix}${encodedMsg}${suffix}`;
}
