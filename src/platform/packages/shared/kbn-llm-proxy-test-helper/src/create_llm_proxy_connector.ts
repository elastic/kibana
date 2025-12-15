/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LlmProxy } from './proxy';

interface SuperTestLike {
  post(url: string): SuperTestLike;
  delete(url: string): SuperTestLike;
  set(key: string, value: string): SuperTestLike;
  send(body: unknown): SuperTestLike;
  expect(status: number): Promise<{ body: { id: string } }>;
}

/**
 * Creates a .gen-ai connector that points to the LLM proxy server.
 * This allows tests to intercept and mock LLM responses.
 *
 * @param supertest - The supertest agent to use for API calls
 * @param proxy - The LLM proxy instance
 * @param name - Optional name for the connector (defaults to 'LLM Proxy Connector')
 * @returns The connector ID
 */
export async function createLlmProxyConnector({
  supertest,
  proxy,
  name = 'LLM Proxy Connector',
}: {
  supertest: SuperTestLike;
  proxy: LlmProxy;
  name?: string;
}): Promise<string> {
  const { body } = await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'true')
    .send({
      name,
      connector_type_id: '.gen-ai',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxy.getPort()}`,
      },
      secrets: {
        apiKey: 'fake-api-key',
      },
    })
    .expect(200);

  return body.id;
}

/**
 * Deletes a connector by ID.
 *
 * @param supertest - The supertest agent to use for API calls
 * @param connectorId - The ID of the connector to delete
 */
export async function deleteLlmProxyConnector({
  supertest,
  connectorId,
}: {
  supertest: SuperTestLike;
  connectorId: string;
}): Promise<void> {
  await supertest
    .delete(`/api/actions/connector/${connectorId}`)
    .set('kbn-xsrf', 'true')
    .expect(204);
}
