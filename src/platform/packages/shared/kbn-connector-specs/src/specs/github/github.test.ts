/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { GithubConnector } from './github';

interface HttpError extends Error {
  response?: {
    status: number;
    data?: unknown;
  };
}

describe('GithubConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listRepos action', () => {
    it('should list repositories for an owner', async () => {
      const mockResponse = {
        data: [
          { name: 'repo1', full_name: 'owner/repo1' },
          { name: 'repo2', full_name: 'owner/repo2' },
          { name: 'repo3', full_name: 'owner/repo3' },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.listRepos.handler(mockContext, {
        owner: 'owner',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/users/owner/repos');
      expect(result).toEqual(['repo1', 'repo2', 'repo3']);
    });

    it('should handle empty repository list', async () => {
      const mockResponse = {
        data: [],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.listRepos.handler(mockContext, {
        owner: 'empty-owner',
      });

      expect(result).toEqual([]);
    });

    it('should throw error when owner is not found', async () => {
      const error: HttpError = new Error('Not found');
      error.response = { status: 404 };
      mockClient.get.mockRejectedValue(error);

      await expect(
        GithubConnector.actions.listRepos.handler(mockContext, {
          owner: 'nonexistent-owner',
        })
      ).rejects.toThrow('Not found');
    });

    it('should rethrow non-404 errors', async () => {
      const error: HttpError = new Error('Server error');
      error.response = { status: 500 };
      mockClient.get.mockRejectedValue(error);

      await expect(
        GithubConnector.actions.listRepos.handler(mockContext, {
          owner: 'owner',
        })
      ).rejects.toThrow('Server error');
    });
  });

  describe('searchIssues action', () => {
    it('should search for issues without query', async () => {
      const mockResponse = {
        data: {
          total_count: 2,
          items: [
            { number: 1, title: 'Issue 1', state: 'open' },
            { number: 2, title: 'Issue 2', state: 'open' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.searchIssues.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/search/issues', {
        params: {
          q: 'repo:owner/repo is:issue is:open',
        },
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should search for issues with query', async () => {
      const mockResponse = {
        data: {
          total_count: 1,
          items: [{ number: 1, title: 'Bug fix', state: 'open' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.searchIssues.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        query: 'bug',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/search/issues', {
        params: {
          q: 'repo:owner/repo is:issue is:open bug',
        },
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle invalid search query', async () => {
      const error: HttpError = new Error('Validation failed');
      error.response = {
        status: 422,
        data: {
          message: 'Invalid query syntax',
        },
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        GithubConnector.actions.searchIssues.handler(mockContext, {
          owner: 'owner',
          repo: 'repo',
          query: 'invalid query syntax',
        })
      ).rejects.toThrow('Validation failed');
    });

    it('should handle 422 error without message', async () => {
      const error: HttpError = new Error('Validation failed');
      error.response = {
        status: 422,
        data: {},
      };
      mockClient.get.mockRejectedValue(error);

      await expect(
        GithubConnector.actions.searchIssues.handler(mockContext, {
          owner: 'owner',
          repo: 'repo',
        })
      ).rejects.toThrow('Validation failed');
    });

    it('should rethrow non-422 errors', async () => {
      const error: HttpError = new Error('Server error');
      error.response = { status: 500 };
      mockClient.get.mockRejectedValue(error);

      await expect(
        GithubConnector.actions.searchIssues.handler(mockContext, {
          owner: 'owner',
          repo: 'repo',
        })
      ).rejects.toThrow('Server error');
    });
  });

  describe('getDocs action', () => {
    it('should get markdown files from repository', async () => {
      const commitResponse = {
        data: {
          sha: 'abc123',
        },
      };

      const treeResponse = {
        data: {
          tree: [
            { type: 'blob', path: 'README.md', sha: 'sha1' },
            { type: 'blob', path: 'docs/guide.md', sha: 'sha2' },
            { type: 'tree', path: 'src', sha: 'sha3' },
            { type: 'blob', path: 'file.txt', sha: 'sha4' },
          ],
        },
      };

      const contentResponse1 = {
        data: {
          name: 'README.md',
          path: 'README.md',
          content: Buffer.from('Content 1').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/README.md',
        },
      };

      const contentResponse2 = {
        data: {
          name: 'guide.md',
          path: 'docs/guide.md',
          content: Buffer.from('Content 2').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/docs/guide.md',
        },
      };

      mockClient.get
        .mockResolvedValueOnce(commitResponse)
        .mockResolvedValueOnce(treeResponse)
        .mockResolvedValueOnce(contentResponse1)
        .mockResolvedValueOnce(contentResponse2);

      const result = await GithubConnector.actions.getDocs.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/commits/main',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/git/trees/abc123',
        {
          params: { recursive: '1' },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/README.md',
        {
          params: { ref: 'main' },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/docs/guide.md',
        {
          params: { ref: 'main' },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      expect(result).toEqual([
        {
          name: 'README.md',
          path: 'README.md',
          content: Buffer.from('Content 1').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/README.md',
        },
        {
          name: 'guide.md',
          path: 'docs/guide.md',
          content: Buffer.from('Content 2').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/docs/guide.md',
        },
      ]);
    });

    it('should use custom ref when provided', async () => {
      const commitResponse = {
        data: {
          sha: 'def456',
        },
      };

      const treeResponse = {
        data: {
          tree: [{ type: 'blob', path: 'README.md', sha: 'sha1' }],
        },
      };

      const contentResponse = {
        data: {
          name: 'README.md',
          path: 'README.md',
          content: Buffer.from('Content').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/develop/README.md',
        },
      };

      mockClient.get
        .mockResolvedValueOnce(commitResponse)
        .mockResolvedValueOnce(treeResponse)
        .mockResolvedValueOnce(contentResponse);

      await GithubConnector.actions.getDocs.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        ref: 'develop',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/commits/develop',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/README.md',
        {
          params: { ref: 'develop' },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
    });

    it('should throw error when no markdown files found', async () => {
      const commitResponse = {
        data: {
          sha: 'abc123',
        },
      };

      const treeResponse = {
        data: {
          tree: [
            { type: 'blob', path: 'file.txt', sha: 'sha1' },
            { type: 'tree', path: 'src', sha: 'sha2' },
          ],
        },
      };

      mockClient.get.mockResolvedValueOnce(commitResponse).mockResolvedValueOnce(treeResponse);

      await expect(
        GithubConnector.actions.getDocs.handler(mockContext, {
          owner: 'owner',
          repo: 'repo',
        })
      ).rejects.toThrow('No .md files found in repository owner/repo');
    });

    it('should filter only blob type files', async () => {
      const commitResponse = {
        data: {
          sha: 'abc123',
        },
      };

      const treeResponse = {
        data: {
          tree: [
            { type: 'tree', path: 'docs', sha: 'sha1' },
            { type: 'blob', path: 'README.md', sha: 'sha2' },
          ],
        },
      };

      const contentResponse = {
        data: {
          name: 'README.md',
          path: 'README.md',
          content: Buffer.from('Content').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/README.md',
        },
      };

      mockClient.get
        .mockResolvedValueOnce(commitResponse)
        .mockResolvedValueOnce(treeResponse)
        .mockResolvedValueOnce(contentResponse);

      const result = (await GithubConnector.actions.getDocs.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
      })) as Array<{ name: string; path: string; content: string; html_url: string }>;

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('README.md');
    });

    it('should filter case-insensitively for .md extension', async () => {
      const commitResponse = {
        data: {
          sha: 'abc123',
        },
      };

      const treeResponse = {
        data: {
          tree: [
            { type: 'blob', path: 'README.MD', sha: 'sha1' },
            { type: 'blob', path: 'docs/Guide.Md', sha: 'sha2' },
            { type: 'blob', path: 'file.md', sha: 'sha3' },
          ],
        },
      };

      const contentResponse1 = {
        data: {
          name: 'README.MD',
          path: 'README.MD',
          content: Buffer.from('Content 1').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/README.MD',
        },
      };

      const contentResponse2 = {
        data: {
          name: 'Guide.Md',
          path: 'docs/Guide.Md',
          content: Buffer.from('Content 2').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/docs/Guide.Md',
        },
      };

      const contentResponse3 = {
        data: {
          name: 'file.md',
          path: 'file.md',
          content: Buffer.from('Content 3').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/file.md',
        },
      };

      mockClient.get
        .mockResolvedValueOnce(commitResponse)
        .mockResolvedValueOnce(treeResponse)
        .mockResolvedValueOnce(contentResponse1)
        .mockResolvedValueOnce(contentResponse2)
        .mockResolvedValueOnce(contentResponse3);

      const result = await GithubConnector.actions.getDocs.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
      });

      expect(result).toHaveLength(3);
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        status: 200,
        data: {
          id: 'user-1',
          login: 'alice',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!GithubConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GithubConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/user');
      expect(mockContext.log.debug).toHaveBeenCalledWith('Github test handler');
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Github API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      const mockResponse = {
        status: 401,
        data: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!GithubConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GithubConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/user');
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Failed to connect to Github API');
    });
  });
});
