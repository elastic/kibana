/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOW_EXTERNAL_CRED_PURPOSE } from './external_creds_constants';
import { WorkflowExternalCredsStore } from './workflow_external_creds_store';

describe('WorkflowExternalCredsStore', () => {
  const esClient = {
    index: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  const store = new WorkflowExternalCredsStore(esClient as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores credentials by api key id', async () => {
    await store.put({
      id: 'api-key-id',
      purpose: WORKFLOW_EXTERNAL_CRED_PURPOSE.EXTERNAL_RESUME,
      secret: 'encoded-secret',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'api-key-id',
        document: {
          purpose: WORKFLOW_EXTERNAL_CRED_PURPOSE.EXTERNAL_RESUME,
          secret: 'encoded-secret',
          expiresAt: expect.any(String),
        },
      })
    );
  });

  it('returns the secret when purpose and expiry are valid', async () => {
    esClient.get.mockResolvedValue({
      _source: {
        purpose: WORKFLOW_EXTERNAL_CRED_PURPOSE.EXTERNAL_RESUME,
        secret: 'encoded-secret',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    await expect(
      store.get({
        id: 'api-key-id',
        expectedPurpose: WORKFLOW_EXTERNAL_CRED_PURPOSE.EXTERNAL_RESUME,
      })
    ).resolves.toBe('encoded-secret');
  });

  it('rejects mismatched purpose and expired credentials', async () => {
    esClient.get.mockResolvedValueOnce({
      _source: {
        purpose: 'other-purpose',
        secret: 'encoded-secret',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    esClient.get.mockResolvedValueOnce({
      _source: {
        purpose: WORKFLOW_EXTERNAL_CRED_PURPOSE.EXTERNAL_RESUME,
        secret: 'encoded-secret',
        expiresAt: new Date(Date.now() - 1).toISOString(),
      },
    });

    await expect(
      store.get({
        id: 'api-key-id',
        expectedPurpose: WORKFLOW_EXTERNAL_CRED_PURPOSE.EXTERNAL_RESUME,
      })
    ).resolves.toBeUndefined();

    await expect(
      store.get({
        id: 'api-key-id',
        expectedPurpose: WORKFLOW_EXTERNAL_CRED_PURPOSE.EXTERNAL_RESUME,
      })
    ).resolves.toBeUndefined();
  });

  it('returns undefined when the credential document is missing', async () => {
    esClient.get.mockRejectedValue({ meta: { statusCode: 404 } });

    await expect(
      store.get({
        id: 'missing-id',
        expectedPurpose: WORKFLOW_EXTERNAL_CRED_PURPOSE.EXTERNAL_RESUME,
      })
    ).resolves.toBeUndefined();
  });
});
