/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function buildExternalResumeUrl({
  kibanaUrl,
  spaceId,
  executionId,
  encodedApiKey,
}: {
  kibanaUrl: string;
  spaceId: string;
  executionId: string;
  encodedApiKey: string;
}): string {
  const spacePrefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
  const url = new URL(
    `${kibanaUrl}${spacePrefix}/api/workflows/executions/${executionId}/resume/external`
  );
  url.searchParams.set('apiKey', encodedApiKey);
  return url.toString();
}
