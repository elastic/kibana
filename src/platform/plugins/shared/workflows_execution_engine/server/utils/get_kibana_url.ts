/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreStart } from '@kbn/core/server';

const LOCALHOST_FALLBACK = 'http://localhost:5601';

export function getKibanaUrl(
  coreStart?: CoreStart,
  cloudSetup?: CloudSetup,
  forceServerInfo: boolean = false,
  forceLocalhost: boolean = false
): string {
  // Force flags take precedence (forceServerInfo wins over forceLocalhost)
  if (forceServerInfo) {
    return getServerInfoUrl(coreStart) ?? LOCALHOST_FALLBACK;
  }

  if (forceLocalhost) {
    return LOCALHOST_FALLBACK;
  }

  // Default resolution order: publicBaseUrl → cloud URL → server info → localhost
  return (
    coreStart?.http?.basePath?.publicBaseUrl ??
    cloudSetup?.kibanaUrl ??
    getServerInfoUrl(coreStart) ??
    LOCALHOST_FALLBACK
  );
}

function getServerInfoUrl(coreStart?: CoreStart): string | undefined {
  const http = coreStart?.http;
  if (!http) {
    return undefined;
  }
  const { protocol, hostname, port } = http.getServerInfo();
  return `${protocol}://${hostname}:${port}${http.basePath.prepend('/').slice(0, -1)}`;
}

export function buildWorkflowExecutionUrl(
  kibanaUrl: string,
  spaceId: string,
  workflowId: string,
  executionId: string,
  stepExecutionId?: string
): string {
  const spacePrefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
  const baseUrl = `${kibanaUrl}${spacePrefix}/app/workflows/${workflowId}`;
  const params = new URLSearchParams({
    executionId,
    tab: 'executions',
  });

  if (stepExecutionId) {
    params.set('stepExecutionId', stepExecutionId);
  }

  return `${baseUrl}?${params.toString()}`;
}
