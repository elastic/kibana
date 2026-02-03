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

export function getKibanaUrl(coreStart?: CoreStart, cloudSetup?: CloudSetup): string {
  if (coreStart?.http?.basePath?.publicBaseUrl) {
    return coreStart.http.basePath.publicBaseUrl;
  }

  if (cloudSetup?.kibanaUrl) {
    return cloudSetup.kibanaUrl;
  }

  const http = coreStart?.http;
  if (http) {
    const { protocol, hostname, port } = http.getServerInfo();
    return `${protocol}://${hostname}:${port}${http.basePath.prepend('/').slice(0, -1)}`;
  }

  return 'http://localhost:5601';
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
