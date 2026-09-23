/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, AuthTypeDef } from '../../connector_spec';
import { generateSecretsSchemaFromSpec } from '../../lib/generate_secrets_schema_from_spec';
import { GmailConnector } from './gmail';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// ---------------------------------------------------------------------------
// Shared mock infrastructure
// ---------------------------------------------------------------------------

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
};

/** Context for read-only actions (no secrets recorded — bearer or legacy). */
const mockContext = {
  client: mockClient,
  log: { debug: jest.fn(), error: jest.fn() },
} as unknown as ActionContext;

/** Context for write-capable actions (oauth_authorization_code + gmail.modify scope). */
const mockWriteContext = {
  client: mockClient,
  log: { debug: jest.fn(), error: jest.fn() },
  secrets: {
    authType: 'oauth_authorization_code',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
  },
} as unknown as ActionContext;

/** Context that simulates an EARS-authed connector (read-only, scope is fixed). */
const mockEarsContext = {
  client: mockClient,
  log: { debug: jest.fn(), error: jest.fn() },
  secrets: { authType: 'ears', scope: 'https://www.googleapis.com/auth/gmail.readonly' },
} as unknown as ActionContext;

/** Context that simulates a connector re-authorized under the old readonly scope. */
const mockStaleOAuthContext = {
  client: mockClient,
  log: { debug: jest.fn(), error: jest.fn() },
  secrets: {
    authType: 'oauth_authorization_code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
  },
} as unknown as ActionContext;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

describe('metadata', () => {
  it('has required metadata', () => {
    expect(GmailConnector.metadata.id).toBe('.gmail');
    expect(GmailConnector.metadata.displayName).toBe('Gmail');
    expect(GmailConnector.metadata.supportedFeatureIds).toContain('workflows');
    expect(GmailConnector.metadata.supportedFeatureIds).toContain('contextEngine');
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('auth', () => {
  it('supports ears auth type as first visible option', () => {
    const visibleTypes = GmailConnector.auth?.types.filter(
      (t) => typeof t === 'string' || !(t as AuthTypeDef).isLegacy
    );
    expect(visibleTypes?.[0]).toEqual(expect.objectContaining({ type: 'ears' }));
  });

  it('ears auth type keeps isExperimental: true (required by ears_experimental_utils.test.ts)', () => {
    const earsType = GmailConnector.auth?.types.find(
      (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'ears'
    );
    expect(earsType?.isExperimental).toBe(true);
  });

  it('bearer auth is hidden (not shown in picker) but retained for existing connectors', () => {
    const bearerDef = GmailConnector.auth?.types.find(
      (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'bearer'
    );
    expect(bearerDef).toBeDefined();
    expect(bearerDef?.isLegacy).toBe(true);
  });

  it('existing connectors with bearer auth still pass schema validation', () => {
    const schema = generateSecretsSchemaFromSpec(GmailConnector.auth, {
      isEarsEnabled: true,
      isEarsExperimentalEnabled: true,
    });
    const result = schema.safeParse({ authType: 'bearer', token: 'some-legacy-token' });
    expect(result.success).toBe(true);
  });

  it('supports oauth_authorization_code with gmail.modify scope', () => {
    const oauthType = GmailConnector.auth?.types.find(
      (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
    );
    expect(oauthType).toMatchObject({
      type: 'oauth_authorization_code',
      defaults: {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/gmail.modify',
      },
    });
  });

  it('supports ears auth type with gmail.readonly scope and correct Google defaults', () => {
    const types = GmailConnector.auth?.types as Array<
      | string
      | { type: string; defaults?: Record<string, unknown>; overrides?: Record<string, unknown> }
    >;
    const earsType = types.find((t) => typeof t === 'object' && t.type === 'ears');
    expect(earsType).toMatchObject({
      type: 'ears',
      defaults: {
        provider: 'google',
        // EARS scope is intentionally read-only — write actions are not available with EARS.
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
      },
      overrides: {
        meta: { scope: { disabled: true } },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Actions — wiring
// ---------------------------------------------------------------------------

describe('actions wiring', () => {
  it('exposes all 12 actions', () => {
    const actionNames = Object.keys(GmailConnector.actions);
    expect(actionNames).toEqual(
      expect.arrayContaining([
        'searchMessages',
        'getMessage',
        'getAttachment',
        'listMessages',
        'listLabels',
        'modifyLabels',
        'markAsRead',
        'markAsUnread',
        'trashMessage',
        'untrashMessage',
        'sendMessage',
        'replyMessage',
      ])
    );
  });

  it('read actions and label-read actions are tools', () => {
    for (const name of [
      'searchMessages',
      'getMessage',
      'getAttachment',
      'listMessages',
      'listLabels',
      'markAsRead',
      'markAsUnread',
    ]) {
      expect(GmailConnector.actions[name].isTool).toBe(true);
    }
  });

  it('outbound-email actions are NOT tools', () => {
    for (const name of ['sendMessage', 'replyMessage']) {
      expect(GmailConnector.actions[name].isTool).toBeFalsy();
    }
  });

  it('mutating mailbox actions are tools', () => {
    for (const name of ['modifyLabels', 'trashMessage', 'untrashMessage']) {
      expect(GmailConnector.actions[name].isTool).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// searchMessages
// ---------------------------------------------------------------------------

describe('searchMessages', () => {
  it('should return messages and pass query and maxResults', async () => {
    const mockResponse = {
      data: {
        messages: [{ id: 'msg-1', threadId: 't1' }],
        nextPageToken: undefined,
        resultSizeEstimate: 1,
      },
    };
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await GmailConnector.actions.searchMessages.handler(mockContext, {
      query: 'from:alice@example.com is:unread',
      maxResults: 20,
    });

    expect(mockClient.get).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages`, {
      params: { maxResults: 20, q: 'from:alice@example.com is:unread' },
    });
    expect(result).toEqual({
      messages: mockResponse.data.messages,
      nextPageToken: undefined,
      resultSizeEstimate: 1,
    });
  });

  it('should include pageToken when provided', async () => {
    const mockResponse = {
      data: { messages: [], nextPageToken: 'next', resultSizeEstimate: 0 },
    };
    mockClient.get.mockResolvedValue(mockResponse);

    await GmailConnector.actions.searchMessages.handler(mockContext, {
      query: 'is:unread',
      maxResults: 10,
      pageToken: 'token-123',
    });

    expect(mockClient.get).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages`, {
      params: { maxResults: 10, q: 'is:unread', pageToken: 'token-123' },
    });
  });

  it('should cap maxResults at 100', async () => {
    const mockResponse = { data: { messages: [], resultSizeEstimate: 0 } };
    mockClient.get.mockResolvedValue(mockResponse);

    await GmailConnector.actions.searchMessages.handler(mockContext, {
      maxResults: 500,
    });

    expect(mockClient.get).toHaveBeenCalledWith(
      `${GMAIL_API_BASE}/messages`,
      expect.objectContaining({
        params: expect.objectContaining({ maxResults: 100 }),
      })
    );
  });

  it('should throw Gmail API error when present', async () => {
    mockClient.get.mockRejectedValue({
      response: { data: { error: { code: 403, message: 'Forbidden' } } },
    });

    await expect(
      GmailConnector.actions.searchMessages.handler(mockContext, { maxResults: 10 })
    ).rejects.toThrow('Gmail API error (403): Forbidden');
  });

  it('should rethrow original error when there is no Gmail API error body', async () => {
    const networkError = new Error('network error');
    mockClient.get.mockRejectedValue(networkError);

    await expect(
      GmailConnector.actions.searchMessages.handler(mockContext, { maxResults: 10 })
    ).rejects.toThrow('network error');
  });
});

// ---------------------------------------------------------------------------
// getMessage
// ---------------------------------------------------------------------------

describe('getMessage', () => {
  it('should fetch message by id with format', async () => {
    const mockResponse = {
      data: { id: 'msg-1', threadId: 't1', labelIds: ['INBOX'], snippet: 'Hello' },
    };
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await GmailConnector.actions.getMessage.handler(mockContext, {
      messageId: 'msg-1',
      format: 'full',
    });

    expect(mockClient.get).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/msg-1`, {
      params: { format: 'full' },
    });
    expect(result).toEqual(mockResponse.data);
  });

  it('should default format to minimal', async () => {
    const mockResponse = { data: { id: 'msg-1' } };
    mockClient.get.mockResolvedValue(mockResponse);

    await GmailConnector.actions.getMessage.handler(mockContext, { messageId: 'msg-1' });

    expect(mockClient.get).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/msg-1`, {
      params: { format: 'minimal' },
    });
  });

  it('encodes special characters in messageId in the URL', async () => {
    mockClient.get.mockResolvedValue({ data: {} });
    await GmailConnector.actions.getMessage.handler(mockContext, { messageId: 'a/b?c' });
    expect(mockClient.get).toHaveBeenCalledWith(
      `${GMAIL_API_BASE}/messages/a%2Fb%3Fc`,
      expect.any(Object)
    );
  });

  it('should throw Gmail API error when present', async () => {
    mockClient.get.mockRejectedValue({
      response: { data: { error: { code: 404, message: 'Not Found' } } },
    });

    await expect(
      GmailConnector.actions.getMessage.handler(mockContext, { messageId: 'bad-id' })
    ).rejects.toThrow('Gmail API error (404): Not Found');
  });

  it('should rethrow original error when there is no Gmail API error body', async () => {
    mockClient.get.mockRejectedValue(new Error('timeout'));

    await expect(
      GmailConnector.actions.getMessage.handler(mockContext, { messageId: 'msg-1' })
    ).rejects.toThrow('timeout');
  });
});

// ---------------------------------------------------------------------------
// getAttachment
// ---------------------------------------------------------------------------

describe('getAttachment', () => {
  it('should fetch attachment by messageId and attachmentId', async () => {
    const mockResponse = { data: { data: 'base64urlEncodedContent' } };
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await GmailConnector.actions.getAttachment.handler(mockContext, {
      messageId: 'msg-1',
      attachmentId: 'ANGjdJ1',
    });

    expect(mockClient.get).toHaveBeenCalledWith(
      `${GMAIL_API_BASE}/messages/msg-1/attachments/ANGjdJ1`
    );
    expect(result).toEqual(mockResponse.data);
  });

  it('encodes special characters in messageId and attachmentId in the URL', async () => {
    mockClient.get.mockResolvedValue({ data: {} });
    await GmailConnector.actions.getAttachment.handler(mockContext, {
      messageId: 'a/b',
      attachmentId: 'c?d',
    });
    expect(mockClient.get).toHaveBeenCalledWith(
      `${GMAIL_API_BASE}/messages/a%2Fb/attachments/c%3Fd`
    );
  });

  it('should throw Gmail API error when present', async () => {
    mockClient.get.mockRejectedValue({
      response: { data: { error: { code: 404, message: 'Attachment not found' } } },
    });

    await expect(
      GmailConnector.actions.getAttachment.handler(mockContext, {
        messageId: 'msg-1',
        attachmentId: 'bad-att-id',
      })
    ).rejects.toThrow('Gmail API error (404): Attachment not found');
  });
});

// ---------------------------------------------------------------------------
// listMessages
// ---------------------------------------------------------------------------

describe('listMessages', () => {
  it('should return messages with default params', async () => {
    const mockResponse = {
      data: {
        messages: [{ id: 'm1', threadId: 't1' }],
        nextPageToken: undefined,
        resultSizeEstimate: 1,
      },
    };
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await GmailConnector.actions.listMessages.handler(mockContext, {});

    expect(mockClient.get).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages`, {
      params: { maxResults: 10 },
      paramsSerializer: { indexes: null },
    });
    expect(result).toEqual({
      messages: mockResponse.data.messages,
      nextPageToken: undefined,
      resultSizeEstimate: 1,
    });
  });

  it('should include labelIds and pageToken when provided', async () => {
    const mockResponse = { data: { messages: [], resultSizeEstimate: 0 } };
    mockClient.get.mockResolvedValue(mockResponse);

    await GmailConnector.actions.listMessages.handler(mockContext, {
      maxResults: 50,
      labelIds: ['INBOX', 'SENT'],
      pageToken: 'page-2',
    });

    expect(mockClient.get).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages`, {
      params: { maxResults: 50, labelIds: ['INBOX', 'SENT'], pageToken: 'page-2' },
      paramsSerializer: { indexes: null },
    });
  });

  it('should cap maxResults at 100', async () => {
    const mockResponse = { data: { messages: [], resultSizeEstimate: 0 } };
    mockClient.get.mockResolvedValue(mockResponse);

    await GmailConnector.actions.listMessages.handler(mockContext, { maxResults: 200 });

    expect(mockClient.get).toHaveBeenCalledWith(
      `${GMAIL_API_BASE}/messages`,
      expect.objectContaining({
        params: expect.objectContaining({ maxResults: 100 }),
      })
    );
  });

  it('should throw Gmail API error when present', async () => {
    mockClient.get.mockRejectedValue({
      response: { data: { error: { code: 401, message: 'Invalid credentials' } } },
    });

    await expect(
      GmailConnector.actions.listMessages.handler(mockContext, { maxResults: 10 })
    ).rejects.toThrow('Gmail API error (401): Invalid credentials');
  });

  it('should rethrow original error when there is no Gmail API error body', async () => {
    mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      GmailConnector.actions.listMessages.handler(mockContext, { maxResults: 10 })
    ).rejects.toThrow('ECONNREFUSED');
  });
});

// ---------------------------------------------------------------------------
// listLabels
// ---------------------------------------------------------------------------

describe('listLabels', () => {
  it('returns the labels array from the response', async () => {
    const mockLabels = [
      { id: 'INBOX', name: 'INBOX', type: 'system' },
      { id: 'Label_42', name: 'Quarantine', type: 'user' },
    ];
    mockClient.get.mockResolvedValue({ data: { labels: mockLabels } });

    const result = await GmailConnector.actions.listLabels.handler(mockWriteContext, {});

    expect(mockClient.get).toHaveBeenCalledWith(`${GMAIL_API_BASE}/labels`);
    expect(result).toEqual({ labels: mockLabels });
  });

  it('returns empty array when response has no labels', async () => {
    mockClient.get.mockResolvedValue({ data: {} });
    const result = await GmailConnector.actions.listLabels.handler(mockWriteContext, {});
    expect(result).toEqual({ labels: [] });
  });

  it('throws Gmail API error when present', async () => {
    mockClient.get.mockRejectedValue({
      response: { data: { error: { code: 403, message: 'Forbidden' } } },
    });
    await expect(GmailConnector.actions.listLabels.handler(mockWriteContext, {})).rejects.toThrow(
      'Gmail API error (403): Forbidden'
    );
  });
});

// ---------------------------------------------------------------------------
// modifyLabels
// ---------------------------------------------------------------------------

describe('modifyLabels', () => {
  it('sends the correct POST with addLabelIds and removeLabelIds', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 'msg-1', threadId: 't1', labelIds: ['Label_42'] },
    });

    const result = await GmailConnector.actions.modifyLabels.handler(mockWriteContext, {
      messageId: 'msg-1',
      addLabelIds: ['Label_42'],
      removeLabelIds: ['INBOX'],
    });

    expect(mockClient.post).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/msg-1/modify`, {
      addLabelIds: ['Label_42'],
      removeLabelIds: ['INBOX'],
    });
    expect(result).toEqual({ id: 'msg-1', threadId: 't1', labelIds: ['Label_42'] });
  });

  it('omits removeLabelIds from the body when only addLabelIds is provided', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 'msg-1', threadId: 't1', labelIds: ['Label_42', 'INBOX'] },
    });
    await GmailConnector.actions.modifyLabels.handler(mockWriteContext, {
      messageId: 'msg-1',
      addLabelIds: ['Label_42'],
    });
    expect(mockClient.post).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/msg-1/modify`, {
      addLabelIds: ['Label_42'],
    });
  });

  it('omits addLabelIds from the body when only removeLabelIds is provided', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 'msg-1', threadId: 't1', labelIds: [] },
    });
    await GmailConnector.actions.modifyLabels.handler(mockWriteContext, {
      messageId: 'msg-1',
      removeLabelIds: ['INBOX'],
    });
    expect(mockClient.post).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/msg-1/modify`, {
      removeLabelIds: ['INBOX'],
    });
  });

  it('rejects when neither addLabelIds nor removeLabelIds is provided', async () => {
    await expect(
      GmailConnector.actions.modifyLabels.handler(mockWriteContext, { messageId: 'msg-1' })
    ).rejects.toThrow();
  });

  it('encodes special characters in messageId in the URL', async () => {
    mockClient.post.mockResolvedValue({ data: { id: 'id', threadId: 't', labelIds: [] } });
    await GmailConnector.actions.modifyLabels.handler(mockWriteContext, {
      messageId: 'a/b?c',
      addLabelIds: ['Label_42'],
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      `${GMAIL_API_BASE}/messages/a%2Fb%3Fc/modify`,
      expect.any(Object)
    );
  });

  it('throws Gmail API error when present', async () => {
    mockClient.post.mockRejectedValue({
      response: { data: { error: { code: 404, message: 'Not Found' } } },
    });
    await expect(
      GmailConnector.actions.modifyLabels.handler(mockWriteContext, {
        messageId: 'msg-1',
        addLabelIds: ['Label_42'],
      })
    ).rejects.toThrow('Gmail API error (404): Not Found');
  });
});

// ---------------------------------------------------------------------------
// markAsRead / markAsUnread
// ---------------------------------------------------------------------------

describe('markAsRead', () => {
  it('sends POST with removeLabelIds: ["UNREAD"]', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 'msg-1', threadId: 't1', labelIds: ['INBOX'] },
    });

    await GmailConnector.actions.markAsRead.handler(mockWriteContext, { messageId: 'msg-1' });

    expect(mockClient.post).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/msg-1/modify`, {
      removeLabelIds: ['UNREAD'],
    });
  });
});

describe('markAsUnread', () => {
  it('sends POST with addLabelIds: ["UNREAD"]', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 'msg-1', threadId: 't1', labelIds: ['INBOX', 'UNREAD'] },
    });

    await GmailConnector.actions.markAsUnread.handler(mockWriteContext, { messageId: 'msg-1' });

    expect(mockClient.post).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/msg-1/modify`, {
      addLabelIds: ['UNREAD'],
    });
  });
});

// ---------------------------------------------------------------------------
// trashMessage / untrashMessage
// ---------------------------------------------------------------------------

describe('trashMessage', () => {
  it('POSTs to the /trash endpoint with an empty body', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 'msg-1', threadId: 't1', labelIds: ['TRASH'] },
    });

    const result = await GmailConnector.actions.trashMessage.handler(mockWriteContext, {
      messageId: 'msg-1',
    });

    expect(mockClient.post).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/msg-1/trash`, {});
    expect(result).toEqual({ id: 'msg-1', threadId: 't1', labelIds: ['TRASH'] });
  });

  it('encodes special characters in messageId in the URL', async () => {
    mockClient.post.mockResolvedValue({ data: { id: 'id', threadId: 't', labelIds: [] } });
    await GmailConnector.actions.trashMessage.handler(mockWriteContext, { messageId: 'a/b?c' });
    expect(mockClient.post).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/a%2Fb%3Fc/trash`, {});
  });

  it('throws Gmail API error when present', async () => {
    mockClient.post.mockRejectedValue({
      response: { data: { error: { code: 404, message: 'Not Found' } } },
    });
    await expect(
      GmailConnector.actions.trashMessage.handler(mockWriteContext, { messageId: 'msg-1' })
    ).rejects.toThrow('Gmail API error (404): Not Found');
  });
});

describe('untrashMessage', () => {
  it('POSTs to the /untrash endpoint with an empty body', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 'msg-1', threadId: 't1', labelIds: ['INBOX'] },
    });

    const result = await GmailConnector.actions.untrashMessage.handler(mockWriteContext, {
      messageId: 'msg-1',
    });

    expect(mockClient.post).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/msg-1/untrash`, {});
    expect(result).toEqual({ id: 'msg-1', threadId: 't1', labelIds: ['INBOX'] });
  });
});

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

describe('sendMessage', () => {
  const decodeRaw = (raw: string) => {
    const message = Buffer.from(raw, 'base64url').toString('utf8');
    const sepIdx = message.indexOf('\r\n\r\n');
    const headerBlock = message.slice(0, sepIdx);
    const bodyBlock = message.slice(sepIdx + 4);
    return {
      headerLines: headerBlock.split('\r\n'),
      body: Buffer.from(bodyBlock.replace(/\r\n/g, ''), 'base64').toString('utf8'),
    };
  };

  it('posts the correct raw message and returns the response', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 'sent-1', threadId: 'thread-1', labelIds: ['SENT'] },
    });

    const result = await GmailConnector.actions.sendMessage.handler(mockWriteContext, {
      to: ['bob@example.com'],
      subject: 'Hello',
      body: 'World',
    });

    const [url, body] = mockClient.post.mock.calls[0] as [string, { raw: string }];
    expect(url).toBe(`${GMAIL_API_BASE}/messages/send`);

    const { headerLines, body: decodedBody } = decodeRaw(body.raw);
    expect(headerLines).toContain('To: bob@example.com');
    expect(headerLines).toContain('Subject: Hello');
    expect(headerLines).toContain('MIME-Version: 1.0');
    expect(headerLines).toContain('Content-Type: text/plain; charset="UTF-8"');
    expect(decodedBody).toBe('World');
    expect((body as unknown as { threadId?: unknown }).threadId).toBeUndefined();

    expect(result).toEqual({ id: 'sent-1', threadId: 'thread-1', labelIds: ['SENT'] });
  });

  it('includes Cc and html body type when provided', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 'sent-2', threadId: 'thread-2', labelIds: ['SENT'] },
    });
    await GmailConnector.actions.sendMessage.handler(mockWriteContext, {
      to: ['bob@example.com'],
      subject: 'Hi',
      body: '<p>Hello</p>',
      bodyType: 'html',
      cc: ['cc@example.com'],
      bcc: ['bcc@example.com'],
    });

    const [, body] = mockClient.post.mock.calls[0] as [string, { raw: string }];
    const { headerLines } = decodeRaw(body.raw);
    expect(headerLines).toContain('Cc: cc@example.com');
    expect(headerLines).toContain('Bcc: bcc@example.com');
    expect(headerLines.find((l) => l.startsWith('Content-Type:'))).toBe(
      'Content-Type: text/html; charset="UTF-8"'
    );
  });

  it('rejects a malformed email address via Zod schema', async () => {
    await expect(
      GmailConnector.actions.sendMessage.handler(mockWriteContext, {
        to: ['not-an-email'],
        subject: 'Hi',
        body: 'body',
      })
    ).rejects.toThrow();
  });

  it('throws Gmail API error when present', async () => {
    mockClient.post.mockRejectedValue({
      response: { data: { error: { code: 403, message: 'Forbidden' } } },
    });
    await expect(
      GmailConnector.actions.sendMessage.handler(mockWriteContext, {
        to: ['bob@example.com'],
        subject: 'Hi',
        body: 'body',
      })
    ).rejects.toThrow('Gmail API error (403): Forbidden');
  });
});

// ---------------------------------------------------------------------------
// replyMessage
// ---------------------------------------------------------------------------

describe('replyMessage', () => {
  const decodeRaw = (raw: string) => {
    const message = Buffer.from(raw, 'base64url').toString('utf8');
    const sepIdx = message.indexOf('\r\n\r\n');
    return { headerLines: message.slice(0, sepIdx).split('\r\n') };
  };

  const makeOriginalMessage = (overrides: Record<string, string> = {}) => ({
    data: {
      id: 'orig-id',
      threadId: 'thread-1',
      payload: {
        headers: [
          { name: 'Message-Id', value: '<orig@mail.gmail.com>' },
          { name: 'Subject', value: 'Invoice' },
          { name: 'From', value: '"Bob" <bob@example.com>' },
          { name: 'References', value: '<first@mail.gmail.com>' },
          ...Object.entries(overrides).map(([name, value]) => ({ name, value })),
        ],
      },
    },
  });

  it('fetches the original with format=metadata and no metadataHeaders param', async () => {
    mockClient.get.mockResolvedValue(makeOriginalMessage());
    mockClient.post.mockResolvedValue({ data: { id: 'r1', threadId: 'thread-1', labelIds: [] } });

    await GmailConnector.actions.replyMessage.handler(mockWriteContext, {
      messageId: 'orig-id',
      body: 'reply text',
    });

    expect(mockClient.get).toHaveBeenCalledWith(`${GMAIL_API_BASE}/messages/orig-id`, {
      params: { format: 'metadata' },
    });
    // Confirm no metadataHeaders array param was passed (axios would serialize it wrong).
    const [, getConfig] = mockClient.get.mock.calls[0] as [
      string,
      { params: Record<string, unknown> }
    ];
    expect(Object.keys(getConfig.params)).not.toContain('metadataHeaders');
  });

  it('threads the reply via threadId and In-Reply-To/References headers', async () => {
    mockClient.get.mockResolvedValue(makeOriginalMessage());
    mockClient.post.mockResolvedValue({ data: { id: 'r1', threadId: 'thread-1', labelIds: [] } });

    await GmailConnector.actions.replyMessage.handler(mockWriteContext, {
      messageId: 'orig-id',
      body: 'reply text',
    });

    const [, postBody] = mockClient.post.mock.calls[0] as [
      string,
      { raw: string; threadId: string }
    ];
    expect(postBody.threadId).toBe('thread-1');

    const { headerLines } = decodeRaw(postBody.raw);
    expect(headerLines).toContain('To: bob@example.com');
    expect(headerLines).toContain('Subject: Re: Invoice');
    expect(headerLines).toContain('In-Reply-To: <orig@mail.gmail.com>');
    expect(headerLines).toContain('References: <first@mail.gmail.com> <orig@mail.gmail.com>');
  });

  it('does not double-prefix "Re:" when the original subject already starts with it', async () => {
    mockClient.get.mockResolvedValue(makeOriginalMessage({ Subject: 'Re: Invoice' }));
    mockClient.post.mockResolvedValue({ data: { id: 'r1', threadId: 'thread-1', labelIds: [] } });

    await GmailConnector.actions.replyMessage.handler(mockWriteContext, {
      messageId: 'orig-id',
      body: 'reply',
    });

    const [, postBody] = mockClient.post.mock.calls[0] as [string, { raw: string }];
    const { headerLines } = decodeRaw(postBody.raw);
    expect(headerLines).toContain('Subject: Re: Invoice');
    expect(headerLines).not.toContain('Subject: Re: Re: Invoice');
  });

  it('uses an explicit "to" override instead of the From header', async () => {
    mockClient.get.mockResolvedValue(makeOriginalMessage());
    mockClient.post.mockResolvedValue({ data: { id: 'r1', threadId: 'thread-1', labelIds: [] } });

    await GmailConnector.actions.replyMessage.handler(mockWriteContext, {
      messageId: 'orig-id',
      body: 'reply',
      to: ['override@example.com'],
    });

    const [, postBody] = mockClient.post.mock.calls[0] as [string, { raw: string }];
    const { headerLines } = decodeRaw(postBody.raw);
    expect(headerLines).toContain('To: override@example.com');
  });

  it('prefers Reply-To over From when determining the default recipient', async () => {
    mockClient.get.mockResolvedValue(makeOriginalMessage({ 'Reply-To': 'replyto@example.com' }));
    mockClient.post.mockResolvedValue({ data: { id: 'r1', threadId: 'thread-1', labelIds: [] } });

    await GmailConnector.actions.replyMessage.handler(mockWriteContext, {
      messageId: 'orig-id',
      body: 'reply',
    });

    const [, postBody] = mockClient.post.mock.calls[0] as [string, { raw: string }];
    const { headerLines } = decodeRaw(postBody.raw);
    expect(headerLines).toContain('To: replyto@example.com');
  });

  it('sends without In-Reply-To/References when the original has no Message-ID', async () => {
    const noMsgIdData = {
      data: {
        id: 'orig-id',
        threadId: 'thread-1',
        payload: {
          headers: [
            { name: 'Subject', value: 'Hi' },
            { name: 'From', value: 'sender@example.com' },
          ],
        },
      },
    };
    mockClient.get.mockResolvedValue(noMsgIdData);
    mockClient.post.mockResolvedValue({ data: { id: 'r1', threadId: 'thread-1', labelIds: [] } });

    await GmailConnector.actions.replyMessage.handler(mockWriteContext, {
      messageId: 'orig-id',
      body: 'reply',
    });

    const [, postBody] = mockClient.post.mock.calls[0] as [
      string,
      { raw: string; threadId: string }
    ];
    expect(postBody.threadId).toBe('thread-1');
    const { headerLines } = decodeRaw(postBody.raw);
    expect(headerLines.some((l) => l.startsWith('In-Reply-To:'))).toBe(false);
    expect(headerLines.some((l) => l.startsWith('References:'))).toBe(false);
  });

  it('throws when no recipient can be determined and no "to" was passed', async () => {
    const noFromData = {
      data: {
        id: 'orig-id',
        threadId: 'thread-1',
        payload: { headers: [{ name: 'Subject', value: 'Hi' }] },
      },
    };
    mockClient.get.mockResolvedValue(noFromData);

    await expect(
      GmailConnector.actions.replyMessage.handler(mockWriteContext, {
        messageId: 'orig-id',
        body: 'reply',
      })
    ).rejects.toThrow(/reply recipient/);
  });

  it('wraps original-message fetch errors with a clear message', async () => {
    mockClient.get.mockRejectedValue(new Error('timeout'));
    await expect(
      GmailConnector.actions.replyMessage.handler(mockWriteContext, {
        messageId: 'orig-id',
        body: 'reply',
      })
    ).rejects.toThrow(/Could not load the original message to reply to/);
  });
});

// ---------------------------------------------------------------------------
// Auth guard — assertWriteCapableAuth
// ---------------------------------------------------------------------------

describe('auth guard', () => {
  const WRITE_ACTIONS = [
    'modifyLabels',
    'markAsRead',
    'markAsUnread',
    'trashMessage',
    'untrashMessage',
    'sendMessage',
    'replyMessage',
  ] as const;

  it.each(WRITE_ACTIONS)(
    '%s throws with a clear message when authType is ears',
    async (actionName) => {
      const input =
        actionName === 'modifyLabels'
          ? { messageId: 'msg-1', addLabelIds: ['L'] }
          : actionName === 'sendMessage'
          ? { to: ['a@b.com'], subject: 'Hi', body: 'body' }
          : { messageId: 'msg-1', body: 'body' };

      await expect(
        GmailConnector.actions[actionName].handler(mockEarsContext, input)
      ).rejects.toThrow(/Elastic managed authentication/);
    }
  );

  it.each(WRITE_ACTIONS)(
    '%s throws with a re-authorize hint when scope is gmail.readonly',
    async (actionName) => {
      const input =
        actionName === 'modifyLabels'
          ? { messageId: 'msg-1', addLabelIds: ['L'] }
          : actionName === 'sendMessage'
          ? { to: ['a@b.com'], subject: 'Hi', body: 'body' }
          : { messageId: 'msg-1', body: 'body' };

      await expect(
        GmailConnector.actions[actionName].handler(mockStaleOAuthContext, input)
      ).rejects.toThrow(/re-authorize/);
    }
  );

  it('does not block writes when authType is bearer (no recorded scope)', async () => {
    mockClient.post.mockResolvedValue({ data: { id: 'id', threadId: 't', labelIds: [] } });
    const bearerCtx = {
      client: mockClient,
      log: { debug: jest.fn(), error: jest.fn() },
      secrets: { authType: 'bearer' },
    } as unknown as ActionContext;

    // Should reach the HTTP call, not throw the guard error.
    await GmailConnector.actions.trashMessage.handler(bearerCtx, { messageId: 'msg-1' });
    expect(mockClient.post).toHaveBeenCalled();
  });

  it('does not block writes when scope is https://mail.google.com/ (broadest scope)', async () => {
    mockClient.post.mockResolvedValue({ data: { id: 'id', threadId: 't', labelIds: [] } });
    const broadCtx = {
      client: mockClient,
      log: { debug: jest.fn(), error: jest.fn() },
      secrets: {
        authType: 'oauth_authorization_code',
        scope: 'https://mail.google.com/',
      },
    } as unknown as ActionContext;

    await GmailConnector.actions.trashMessage.handler(broadCtx, { messageId: 'msg-1' });
    expect(mockClient.post).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Gmail API error handling
// ---------------------------------------------------------------------------

describe('Gmail API error handling', () => {
  it('should use Unknown when error message is missing', async () => {
    mockClient.get.mockRejectedValue({
      response: { data: { error: { code: 500 } } },
    });

    await expect(
      GmailConnector.actions.searchMessages.handler(mockContext, { maxResults: 10 })
    ).rejects.toThrow('Gmail API error (500): Unknown');
  });

  it('appends a re-authorize hint on ACCESS_TOKEN_SCOPE_INSUFFICIENT 403', async () => {
    mockClient.post.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 403,
            message: 'Request had insufficient authentication scopes.',
            status: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT',
          },
        },
      },
    });

    await expect(
      GmailConnector.actions.trashMessage.handler(mockWriteContext, { messageId: 'msg-1' })
    ).rejects.toThrow(/re-authorize/);
  });

  it('appends a re-authorize hint on 403 with insufficientPermissions reason', async () => {
    mockClient.post.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 403,
            message: 'Insufficient Permission',
            errors: [{ reason: 'insufficientPermissions' }],
          },
        },
      },
    });

    await expect(
      GmailConnector.actions.trashMessage.handler(mockWriteContext, { messageId: 'msg-1' })
    ).rejects.toThrow(/re-authorize/);
  });

  it('does NOT append re-authorize hint for a plain 403 Forbidden (e.g. wrong mailbox)', async () => {
    mockClient.get.mockRejectedValue({
      response: { data: { error: { code: 403, message: 'Forbidden' } } },
    });

    const error = await GmailConnector.actions.searchMessages
      .handler(mockContext, { maxResults: 10 })
      .catch((e: Error) => e);

    expect((error as Error).message).toBe('Gmail API error (403): Forbidden');
  });
});

// ---------------------------------------------------------------------------
// Test handler
// ---------------------------------------------------------------------------

describe('test handler', () => {
  const testSpec = GmailConnector.test;

  it('should return ok: true when profile is fetched', async () => {
    const mockResponse = {
      status: 200,
      data: { emailAddress: 'user@gmail.com' },
    };
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await testSpec.handler(mockContext);

    expect(mockClient.get).toHaveBeenCalledWith(`${GMAIL_API_BASE}/profile`);
    expect(result).toEqual({});
  });

  it('should fall back to generic user when emailAddress is missing', async () => {
    mockClient.get.mockResolvedValue({ status: 200, data: {} });

    const result = await testSpec.handler(mockContext);

    expect(result).toEqual({});
  });

  it('should throw on error', async () => {
    mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

    await expect(testSpec.handler(mockContext)).rejects.toThrow();
  });
});
