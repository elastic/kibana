/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, AuthTypeDef } from '../../connector_spec';
import { GoogleDocsConnector } from './google_docs';

const parse = <K extends keyof typeof GoogleDocsConnector.actions>(
  action: K,
  raw: Record<string, unknown>
) => GoogleDocsConnector.actions[action].input.parse(raw);

describe('GoogleDocsConnector', () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();

  const mockContext = {
    client: { get: mockGet, post: mockPost },
    log: { debug: jest.fn() },
    config: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // metadata
  // =========================================================================
  describe('metadata', () => {
    it('has the correct connector ID', () => {
      expect(GoogleDocsConnector.metadata.id).toBe('.google_docs');
    });

    it('ships with agentBuilder feature only (two-step release)', () => {
      expect(GoogleDocsConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('requires enterprise license', () => {
      expect(GoogleDocsConnector.metadata.minimumLicense).toBe('enterprise');
    });

    it('is marked as technical preview', () => {
      expect(GoogleDocsConnector.metadata.isTechnicalPreview).toBe(true);
    });
  });

  // =========================================================================
  // auth
  // =========================================================================
  describe('auth', () => {
    // EARS is commented out in the spec until EARS supports write scopes.
    // it('supports ears auth type as first option', () => {
    //   expect(GoogleDocsConnector.auth?.types[0]).toEqual(expect.objectContaining({ type: 'ears' }));
    // });
    // it('ears auth uses Google provider and required scopes', () => { ... });

    it('does not include ears auth (pending write scope support)', () => {
      const earsType = GoogleDocsConnector.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'ears'
      );
      expect(earsType).toBeUndefined();
    });

    it('supports oauth_authorization_code with correct Google defaults and hidden fields', () => {
      const oauthType = GoogleDocsConnector.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'oauth_authorization_code'
      );
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
        },
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
      });
      const scope = oauthType?.defaults?.scope as string;
      expect(scope).toContain('https://www.googleapis.com/auth/documents');
      expect(scope).toContain('https://www.googleapis.com/auth/drive.readonly');
    });

    it('does not include bearer auth', () => {
      const bearerType = GoogleDocsConnector.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'bearer'
      );
      expect(bearerType).toBeUndefined();
    });
  });

  // =========================================================================
  // readDoc action
  // =========================================================================
  describe('readDoc action', () => {
    const DOC_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
    const META_RESPONSE = {
      data: {
        name: 'My Test Doc',
        mimeType: 'application/vnd.google-apps.document',
        webViewLink: `https://docs.google.com/document/d/${DOC_ID}/edit`,
      },
    };

    it('is exposed as a tool', () => {
      expect(GoogleDocsConnector.actions.readDoc.isTool).toBe(true);
    });

    it('fetches metadata then exports as Markdown', async () => {
      const markdownContent = '# My Test Doc\n\nHello world';
      mockGet.mockResolvedValueOnce(META_RESPONSE).mockResolvedValueOnce({ data: markdownContent });

      const input = parse('readDoc', { document_id: DOC_ID });
      const result = await GoogleDocsConnector.actions.readDoc.handler(mockContext, input);

      expect(mockGet).toHaveBeenNthCalledWith(
        1,
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(DOC_ID)}`,
        expect.objectContaining({
          params: expect.objectContaining({ fields: 'id,name,mimeType,webViewLink' }),
        })
      );
      expect(mockGet).toHaveBeenNthCalledWith(
        2,
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(DOC_ID)}/export`,
        expect.objectContaining({
          params: { mimeType: 'text/markdown' },
          responseType: 'text',
        })
      );
      expect(result).toMatchObject({
        document_id: DOC_ID,
        title: 'My Test Doc',
        content: markdownContent,
        offset: 0,
        total_characters: markdownContent.length,
        truncated: false,
      });
      expect((result as { next_offset?: number }).next_offset).toBeUndefined();
    });

    it('applies default offset of 0 and max_characters of 100,000', async () => {
      const content = 'a'.repeat(50_000);
      mockGet.mockResolvedValueOnce(META_RESPONSE).mockResolvedValueOnce({ data: content });

      const input = parse('readDoc', { document_id: DOC_ID });
      const result = (await GoogleDocsConnector.actions.readDoc.handler(mockContext, input)) as {
        offset: number;
        truncated: boolean;
        total_characters: number;
      };

      expect(result.offset).toBe(0);
      expect(result.truncated).toBe(false);
      expect(result.total_characters).toBe(50_000);
    });

    it('truncates and returns next_offset when content exceeds max_characters', async () => {
      const content = 'a'.repeat(200_000);
      mockGet.mockResolvedValueOnce(META_RESPONSE).mockResolvedValueOnce({ data: content });

      const input = parse('readDoc', { document_id: DOC_ID, max_characters: 50_000 });
      const result = (await GoogleDocsConnector.actions.readDoc.handler(mockContext, input)) as {
        content: string;
        truncated: boolean;
        next_offset: number;
        total_characters: number;
      };

      expect(result.content).toHaveLength(50_000);
      expect(result.truncated).toBe(true);
      expect(result.next_offset).toBe(50_000);
      expect(result.total_characters).toBe(200_000);
    });

    it('applies offset when paging through a long document', async () => {
      const content = 'abcdefghij'.repeat(10_000); // 100,000 chars
      mockGet.mockResolvedValueOnce(META_RESPONSE).mockResolvedValueOnce({ data: content });

      const input = parse('readDoc', {
        document_id: DOC_ID,
        offset: 50_000,
        max_characters: 50_000,
      });
      const result = (await GoogleDocsConnector.actions.readDoc.handler(mockContext, input)) as {
        content: string;
        offset: number;
        truncated: boolean;
      };

      expect(result.offset).toBe(50_000);
      expect(result.content).toBe(content.slice(50_000, 100_000));
      expect(result.truncated).toBe(false);
    });

    it('encodes document_id in the URL', async () => {
      const specialId = 'doc/with spaces&chars';
      mockGet.mockResolvedValueOnce(META_RESPONSE).mockResolvedValueOnce({ data: 'content' });

      const input = parse('readDoc', { document_id: specialId });
      await GoogleDocsConnector.actions.readDoc.handler(mockContext, input);

      expect(mockGet).toHaveBeenNthCalledWith(
        1,
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(specialId)}`,
        expect.anything()
      );
    });

    it('does not split a non-BMP character (emoji) at a page boundary', async () => {
      // '🎉' is U+1F389, a surrogate pair (2 UTF-16 code units) at code-point index 999.
      // With max_characters:1000 the old `string.slice(0, 1000)` would cut inside the
      // surrogate pair, emitting a lone high surrogate. The code-point fix keeps it whole.
      const content = 'a'.repeat(999) + '\u{1F389}' + 'ef'; // 1002 code points
      mockGet.mockResolvedValueOnce(META_RESPONSE).mockResolvedValueOnce({ data: content });

      const input = parse('readDoc', { document_id: DOC_ID, max_characters: 1000 });
      const page1 = (await GoogleDocsConnector.actions.readDoc.handler(mockContext, input)) as {
        content: string;
        next_offset: number;
        truncated: boolean;
      };

      // Page 1 ends with the emoji intact (not a lone high surrogate)
      expect(page1.content).toBe('a'.repeat(999) + '\u{1F389}');
      expect(page1.truncated).toBe(true);
      expect(page1.next_offset).toBe(1000);

      // Page 2 starts with 'e', not the emoji's low surrogate
      mockGet.mockResolvedValueOnce(META_RESPONSE).mockResolvedValueOnce({ data: content });
      const input2 = parse('readDoc', { document_id: DOC_ID, offset: 1000, max_characters: 1000 });
      const page2 = (await GoogleDocsConnector.actions.readDoc.handler(mockContext, input2)) as {
        content: string;
        truncated: boolean;
      };

      expect(page2.content).toBe('ef');
      expect(page2.truncated).toBe(false);
    });

    it('throws when the file is not a Google Doc', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          name: 'spreadsheet.xlsx',
          mimeType: 'application/vnd.google-apps.spreadsheet',
          webViewLink: 'https://docs.google.com/spreadsheets/d/123',
        },
      });

      const input = parse('readDoc', { document_id: DOC_ID });
      await expect(GoogleDocsConnector.actions.readDoc.handler(mockContext, input)).rejects.toThrow(
        'not a Google Doc'
      );
    });

    it('rejects missing document_id', () => {
      expect(() => parse('readDoc', {})).toThrow();
    });

    it('rejects empty document_id', () => {
      expect(() => parse('readDoc', { document_id: '' })).toThrow();
    });

    it('rejects document_id longer than 200 characters', () => {
      expect(() => parse('readDoc', { document_id: 'a'.repeat(201) })).toThrow();
    });

    it('rejects max_characters below 1,000', () => {
      expect(() => parse('readDoc', { document_id: DOC_ID, max_characters: 999 })).toThrow();
    });

    it('rejects max_characters above 200,000', () => {
      expect(() => parse('readDoc', { document_id: DOC_ID, max_characters: 200_001 })).toThrow();
    });

    it('throws when offset is past the end of the document', async () => {
      const content = 'a'.repeat(5_000);
      mockGet.mockResolvedValueOnce(META_RESPONSE).mockResolvedValueOnce({ data: content });

      const input = parse('readDoc', { document_id: DOC_ID, offset: 10_000 });
      await expect(GoogleDocsConnector.actions.readDoc.handler(mockContext, input)).rejects.toThrow(
        'Offset 10000 is past the end of the document'
      );
    });
  });

  // =========================================================================
  // updateDoc action
  // =========================================================================
  describe('updateDoc action', () => {
    const DOC_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';

    it('is exposed as a tool', () => {
      expect(GoogleDocsConnector.actions.updateDoc.isTool).toBe(true);
    });

    it('calls batchUpdate with document_id and requests', async () => {
      const requests = [{ replaceAllText: { containsText: { text: 'old' }, replaceText: 'new' } }];
      mockPost.mockResolvedValueOnce({ data: { documentId: DOC_ID, replies: [{}] } });

      const input = parse('updateDoc', { document_id: DOC_ID, requests });
      await GoogleDocsConnector.actions.updateDoc.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        `https://docs.googleapis.com/v1/documents/${encodeURIComponent(DOC_ID)}:batchUpdate`,
        { requests }
      );
    });

    it('encodes document_id in the URL', async () => {
      const specialId = 'doc/with spaces';
      mockPost.mockResolvedValueOnce({ data: {} });

      const input = parse('updateDoc', {
        document_id: specialId,
        requests: [{ replaceAllText: { containsText: { text: 'a' }, replaceText: 'b' } }],
      });
      await GoogleDocsConnector.actions.updateDoc.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        `https://docs.googleapis.com/v1/documents/${encodeURIComponent(specialId)}:batchUpdate`,
        expect.anything()
      );
    });

    it('accepts multiple requests in one call', async () => {
      const requests = [
        { replaceAllText: { containsText: { text: 'foo' }, replaceText: 'bar' } },
        {
          updateTextStyle: {
            range: { startIndex: 1, endIndex: 5 },
            textStyle: { bold: true },
            fields: 'bold',
          },
        },
      ];
      mockPost.mockResolvedValueOnce({ data: { documentId: DOC_ID, replies: [{}, {}] } });

      const input = parse('updateDoc', { document_id: DOC_ID, requests });
      await GoogleDocsConnector.actions.updateDoc.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining(':batchUpdate'),
        expect.objectContaining({ requests })
      );
    });

    it('rejects empty requests array', () => {
      expect(() => parse('updateDoc', { document_id: DOC_ID, requests: [] })).toThrow();
    });

    it('rejects more than 100 requests', () => {
      const requests = Array.from({ length: 101 }, () => ({
        replaceAllText: { containsText: { text: 'a' }, replaceText: 'b' },
      }));
      expect(() => parse('updateDoc', { document_id: DOC_ID, requests })).toThrow();
    });

    it('rejects missing document_id', () => {
      expect(() =>
        parse('updateDoc', {
          requests: [{ replaceAllText: { containsText: { text: 'a' }, replaceText: 'b' } }],
        })
      ).toThrow();
    });

    it('rejects a request object with more than one operation key', () => {
      expect(() =>
        parse('updateDoc', {
          document_id: DOC_ID,
          requests: [
            {
              replaceAllText: { containsText: { text: 'a' }, replaceText: 'b' },
              insertText: { location: { index: 1 }, text: 'Hello' },
            },
          ],
        })
      ).toThrow('exactly one operation key');
    });

    it('rejects requests whose total serialized size exceeds 100 KB', () => {
      const requests = [
        { replaceAllText: { containsText: { text: 'a'.repeat(103_000) }, replaceText: 'b' } },
      ];
      expect(() => parse('updateDoc', { document_id: DOC_ID, requests })).toThrow(
        'Total size of requests must not exceed 100 KB'
      );
    });

    it('accepts requests whose total serialized size is just under 100 KB', () => {
      // 102,400 bytes limit; build a payload just below it
      const text = 'a'.repeat(100_000);
      const requests = [{ replaceAllText: { containsText: { text }, replaceText: 'b' } }];
      expect(() => parse('updateDoc', { document_id: DOC_ID, requests })).not.toThrow();
    });
  });

  // =========================================================================
  // test handler
  // =========================================================================
  describe('test handler', () => {
    it('is enabled', () => {
      expect(GoogleDocsConnector.test?.enabled).toBe(true);
    });

    it('calls Drive about and Docs API endpoints and returns an empty object', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { user: { displayName: 'Test User' } } }) // Drive about
        .mockRejectedValueOnce({ response: { data: { error: { code: 404 } } } }); // Docs connectivity (404 = accessible)

      const result = await GoogleDocsConnector.test.handler(mockContext);

      expect(mockGet).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/about',
        expect.objectContaining({ params: { fields: 'user' } })
      );
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('KibanaConnectivityCheckAAAAAAAAAAAAAAAAAAAA')
      );
      expect(result).toEqual({});
    });

    it('propagates errors from the Drive about endpoint', async () => {
      mockGet.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(GoogleDocsConnector.test.handler(mockContext)).rejects.toThrow('Unauthorized');
    });

    it('propagates non-404 errors from the Docs API connectivity check', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { user: { displayName: 'Test User' } } })
        .mockRejectedValueOnce({
          response: {
            data: { error: { code: 403, message: 'Insufficient Authentication Scopes' } },
          },
        });

      await expect(GoogleDocsConnector.test.handler(mockContext)).rejects.toThrow(
        'Google Docs API error (403)'
      );
    });
  });
});
