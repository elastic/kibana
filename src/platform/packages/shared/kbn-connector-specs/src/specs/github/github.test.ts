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
            {
              number: 1,
              title: 'Issue 1',
              state: 'open',
              html_url: 'https://github.com/owner/repo/issues/1',
              labels: [{ name: 'bug', color: 'd73a4a' }],
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-02T00:00:00Z',
              comments: 5,
              body: 'Issue description',
              assignees: [{ login: 'user1' }],
              milestone: null,
            },
            {
              number: 2,
              title: 'Issue 2',
              state: 'open',
              html_url: 'https://github.com/owner/repo/issues/2',
              labels: [],
              created_at: '2024-01-03T00:00:00Z',
              updated_at: '2024-01-04T00:00:00Z',
              comments: 0,
              body: null,
              assignees: [],
              milestone: { title: 'v1.0' },
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.searchIssues.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        type: 'issue',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/search/issues', {
        params: {
          q: 'repo:owner/repo is:issue is:open',
          per_page: 10,
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
          items: [
            {
              number: 1,
              title: 'Bug fix',
              state: 'open',
              html_url: 'https://github.com/owner/repo/issues/1',
              labels: [],
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              comments: 0,
              body: null,
              assignees: [],
              milestone: null,
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.searchIssues.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        type: 'issue',
        query: 'bug',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/search/issues', {
        params: {
          q: 'repo:owner/repo is:issue is:open bug',
          per_page: 10,
        },
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should search for pull requests', async () => {
      const mockResponse = {
        data: {
          total_count: 1,
          items: [
            {
              number: 10,
              title: 'PR 1',
              state: 'open',
              html_url: 'https://github.com/owner/repo/pull/10',
              labels: [],
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              comments: 0,
              body: null,
              assignees: [],
              milestone: null,
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.searchIssues.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        type: 'pr',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/search/issues', {
        params: {
          q: 'repo:owner/repo is:pr is:open',
          per_page: 10,
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
          type: 'issue',
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
          type: 'issue',
        })
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('searchRepoContents action', () => {
    it('should search for code without query', async () => {
      const mockResponse = {
        data: {
          total_count: 2,
          items: [
            {
              name: 'file1.ts',
              path: 'src/file1.ts',
              sha: 'abc123',
              url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
              git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
              html_url: 'https://github.com/owner/repo/blob/main/src/file1.ts',
              repository: {
                id: 123,
                name: 'repo',
                full_name: 'owner/repo',
              },
              score: 1.0,
            },
            {
              name: 'file2.js',
              path: 'src/file2.js',
              sha: 'def456',
              url: 'https://api.github.com/repos/owner/repo/git/blobs/def456',
              git_url: 'https://api.github.com/repos/owner/repo/git/blobs/def456',
              html_url: 'https://github.com/owner/repo/blob/main/src/file2.js',
              repository: {
                id: 123,
                name: 'repo',
                full_name: 'owner/repo',
              },
              score: 0.9,
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.searchRepoContents.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/search/code', {
        params: {
          q: 'repo:owner/repo',
        },
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });
      expect(result).toEqual({
        total_count: 2,
        items: [
          {
            name: 'file1.ts',
            path: 'src/file1.ts',
            html_url: 'https://github.com/owner/repo/blob/main/src/file1.ts',
            repository: { full_name: 'owner/repo' },
            score: 1.0,
          },
          {
            name: 'file2.js',
            path: 'src/file2.js',
            html_url: 'https://github.com/owner/repo/blob/main/src/file2.js',
            repository: { full_name: 'owner/repo' },
            score: 0.9,
          },
        ],
      });
    });

    it('should search for code with query', async () => {
      const mockResponse = {
        data: {
          total_count: 1,
          items: [
            {
              name: 'file1.ts',
              path: 'src/file1.ts',
              sha: 'abc123',
              url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
              git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
              html_url: 'https://github.com/owner/repo/blob/main/src/file1.ts',
              repository: {
                id: 123,
                name: 'repo',
                full_name: 'owner/repo',
              },
              score: 1.0,
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.searchRepoContents.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        query: 'function',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.github.com/search/code', {
        params: {
          q: 'repo:owner/repo function',
        },
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });
      expect(result).toEqual({
        total_count: 1,
        items: [
          {
            name: 'file1.ts',
            path: 'src/file1.ts',
            html_url: 'https://github.com/owner/repo/blob/main/src/file1.ts',
            repository: { full_name: 'owner/repo' },
            score: 1.0,
          },
        ],
      });
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
        GithubConnector.actions.searchRepoContents.handler(mockContext, {
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
        GithubConnector.actions.searchRepoContents.handler(mockContext, {
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
        GithubConnector.actions.searchRepoContents.handler(mockContext, {
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

  describe('getDoc action', () => {
    it('should get a single file from repository', async () => {
      const mockResponse = {
        data: {
          name: 'README.md',
          path: 'README.md',
          content: Buffer.from('File content').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/README.md',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getDoc.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        path: 'README.md',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/README.md',
        {
          params: { ref: 'main' },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual({
        name: 'README.md',
        path: 'README.md',
        content: Buffer.from('File content').toString('base64'),
        html_url: 'https://github.com/owner/repo/blob/main/README.md',
      });
    });

    it('should use custom ref when provided', async () => {
      const mockResponse = {
        data: {
          name: 'docs/guide.md',
          path: 'docs/guide.md',
          content: Buffer.from('Guide content').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/develop/docs/guide.md',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getDoc.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        path: 'docs/guide.md',
        ref: 'develop',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/docs/guide.md',
        {
          params: { ref: 'develop' },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual({
        name: 'docs/guide.md',
        path: 'docs/guide.md',
        content: Buffer.from('Guide content').toString('base64'),
        html_url: 'https://github.com/owner/repo/blob/develop/docs/guide.md',
      });
    });
  });

  describe('getFileContents action', () => {
    it('should get a file from repository', async () => {
      const mockResponse = {
        data: {
          name: 'README.md',
          path: 'README.md',
          content: Buffer.from('File content').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/main/README.md',
          size: 1024,
          type: 'file',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getFileContents.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        path: 'README.md',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/README.md',
        {
          params: { ref: 'main' },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should get a directory from repository', async () => {
      const mockResponse = {
        data: [
          {
            name: 'file1.ts',
            path: 'src/file1.ts',
            type: 'file',
            size: 512,
            url: 'https://api.github.com/repos/owner/repo/contents/src/file1.ts',
            html_url: 'https://github.com/owner/repo/blob/main/src/file1.ts',
          },
          {
            name: 'file2.js',
            path: 'src/file2.js',
            type: 'file',
            size: 256,
            url: 'https://api.github.com/repos/owner/repo/contents/src/file2.js',
            html_url: 'https://github.com/owner/repo/blob/main/src/file2.js',
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getFileContents.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        path: 'src/',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/src/',
        {
          params: { ref: 'main' },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should use custom ref when provided', async () => {
      const mockResponse = {
        data: {
          name: 'config.json',
          path: 'config.json',
          content: Buffer.from('Config content').toString('base64'),
          html_url: 'https://github.com/owner/repo/blob/develop/config.json',
          size: 128,
          type: 'file',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getFileContents.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        path: 'config.json',
        ref: 'develop',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/config.json',
        {
          params: { ref: 'develop' },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getIssue action', () => {
    it('should get an issue by number', async () => {
      const mockResponse = {
        data: {
          number: 42,
          title: 'Test Issue',
          body: 'This is a test issue',
          state: 'open',
          labels: [{ name: 'bug', color: 'd73a4a' }],
          assignees: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          html_url: 'https://github.com/owner/repo/issues/42',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getIssue.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        issueNumber: 42,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/42',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getIssueComments action', () => {
    it('should get issue comments without pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            body: 'This is a comment',
            user: {
              login: 'user1',
              id: 123,
            },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            body: 'This is another comment',
            user: {
              login: 'user2',
              id: 456,
            },
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getIssueComments.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        issueNumber: 42,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/42/comments',
        {
          params: {},
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should get issue comments with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: 3,
            body: 'Page 2 comment',
            user: {
              login: 'user3',
              id: 789,
            },
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z',
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getIssueComments.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        issueNumber: 42,
        page: 2,
        perPage: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/42/comments',
        {
          params: {
            page: 2,
            per_page: 10,
          },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getPullRequest action', () => {
    it('should get a pull request by number', async () => {
      const mockResponse = {
        data: {
          number: 123,
          title: 'Test Pull Request',
          body: 'This is a test pull request',
          state: 'open',
          head: {
            ref: 'feature-branch',
            sha: 'abc123',
          },
          base: {
            ref: 'main',
            sha: 'def456',
          },
          merged: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          html_url: 'https://github.com/owner/repo/pull/123',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getPullRequest.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/123',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getPullRequestComments action', () => {
    it('should get pull request comments', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            body: 'This is a review comment',
            user: {
              login: 'user1',
              id: 123,
            },
            path: 'src/file.ts',
            line: 42,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            body: 'This is another review comment',
            user: {
              login: 'user2',
              id: 456,
            },
            path: 'src/other.ts',
            line: 10,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getPullRequestComments.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/123/comments',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getPullRequestDiff action', () => {
    it('should get pull request diff', async () => {
      const mockDiff = `diff --git a/src/file.ts b/src/file.ts
index abc123..def456 100644
--- a/src/file.ts
+++ b/src/file.ts
@@ -1,3 +1,3 @@
-const oldCode = 'old';
+const newCode = 'new';
 console.log('test');
`;
      const mockResponse = {
        data: mockDiff,
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getPullRequestDiff.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/123',
        {
          headers: {
            Accept: 'application/vnd.github.v3.diff',
          },
        }
      );
      expect(result).toEqual(mockDiff);
    });
  });

  describe('getPullRequestFiles action', () => {
    it('should get pull request files', async () => {
      const mockResponse = {
        data: [
          {
            filename: 'src/file1.ts',
            status: 'modified',
            additions: 10,
            deletions: 5,
            changes: 15,
            blob_url: 'https://github.com/owner/repo/blob/abc123/src/file1.ts',
            contents_url: 'https://api.github.com/repos/owner/repo/contents/src/file1.ts',
            patch: '@@ -1,3 +1,3 @@\n-old code\n+new code',
          },
          {
            filename: 'src/file2.js',
            status: 'added',
            additions: 20,
            deletions: 0,
            changes: 20,
            blob_url: 'https://github.com/owner/repo/blob/def456/src/file2.js',
            contents_url: 'https://api.github.com/repos/owner/repo/contents/src/file2.js',
            patch: '@@ -0,0 +1,20 @@\n+new file content',
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getPullRequestFiles.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/123/files',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getPullRequestReviews action', () => {
    it('should get pull request reviews', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            user: {
              login: 'reviewer1',
              id: 123,
            },
            body: 'Looks good to me!',
            state: 'APPROVED',
            submitted_at: '2024-01-01T00:00:00Z',
            commit_id: 'abc123',
          },
          {
            id: 2,
            user: {
              login: 'reviewer2',
              id: 456,
            },
            body: 'Please fix the formatting',
            state: 'CHANGES_REQUESTED',
            submitted_at: '2024-01-02T00:00:00Z',
            commit_id: 'def456',
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.getPullRequestReviews.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/123/reviews',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('listBranches action', () => {
    it('should list branches without pagination', async () => {
      const mockResponse = {
        data: [
          {
            name: 'main',
            commit: {
              sha: 'abc123',
              url: 'https://api.github.com/repos/owner/repo/commits/abc123',
            },
            protected: false,
          },
          {
            name: 'develop',
            commit: {
              sha: 'def456',
              url: 'https://api.github.com/repos/owner/repo/commits/def456',
            },
            protected: false,
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.listBranches.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/branches',
        {
          params: {},
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should list branches with pagination', async () => {
      const mockResponse = {
        data: [
          {
            name: 'feature-branch',
            commit: {
              sha: 'ghi789',
              url: 'https://api.github.com/repos/owner/repo/commits/ghi789',
            },
            protected: false,
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GithubConnector.actions.listBranches.handler(mockContext, {
        owner: 'owner',
        repo: 'repo',
        page: 2,
        perPage: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/branches',
        {
          params: {
            page: 2,
            per_page: 10,
          },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
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
