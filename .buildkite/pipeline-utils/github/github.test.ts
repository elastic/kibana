/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RestEndpointMethodTypes } from '@octokit/rest';
import {
  areChangesSkippable,
  doAnyChangesMatch,
  getGithubClient,
  KIBANA_COMMENT_SIGIL,
  upsertComment,
} from './github.ts';

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(() => ({
    paginate: jest.fn(),
    issues: {
      listComments: jest.fn(),
      createComment: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
    },
  })),
}));

describe('github', () => {
  const getMockChangedFile = (filename: string, previousFilename = '') => {
    return {
      filename,
      previous_filename: previousFilename || undefined,
    } as RestEndpointMethodTypes['pulls']['listFiles']['response']['data'][number];
  };

  describe('doAnyChangesMatch', () => {
    const required = [/^\/required/];

    describe('should return true', () => {
      it('when any file matches', async () => {
        const match = await doAnyChangesMatch(required, [
          getMockChangedFile('/required/index.js'),
          getMockChangedFile('/package.json'),
        ]);

        expect(match).toEqual(true);
      });

      it('when all files match', async () => {
        const match = await doAnyChangesMatch(required, [
          getMockChangedFile('/required/index.js'),
          getMockChangedFile('/required/package.json'),
        ]);

        expect(match).toEqual(true);
      });
    });

    describe('should return false', () => {
      it('when no files match with one file', async () => {
        const match = await doAnyChangesMatch(required, [getMockChangedFile('/index.js')]);

        expect(match).toEqual(false);
      });

      it('when no files match with multiple files', async () => {
        const match = await doAnyChangesMatch(required, [
          getMockChangedFile('/index.js'),
          getMockChangedFile('/package.json'),
        ]);

        expect(match).toEqual(false);
      });
    });
  });

  describe('areChangesSkippable', () => {
    const skippable = [/^docs\//, /^rfcs\//, /\.md$/];
    const required = [/required\.md$/];

    describe('should not be skippable', () => {
      it('when non-skippable files are present', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/required.md'),
          getMockChangedFile('package.json'),
        ]);

        expect(execute).toEqual(false);
      });

      it('when all files are non-skippable, non-required', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('package.json'),
        ]);

        expect(execute).toEqual(false);
      });

      it('when a required file is present', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/required.md'),
          getMockChangedFile('docs/whatever.md'),
        ]);

        expect(execute).toEqual(false);
      });

      it('when a required file is renamed', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/skipme.md', 'docs/required.md'),
        ]);

        expect(execute).toEqual(false);
      });
    });

    describe('should be skippable', () => {
      it('when all files are skippable', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/index.js'),
          getMockChangedFile('README.md'),
        ]);

        expect(execute).toEqual(true);
      });

      it('when all files are skippable and no required files are passed in', async () => {
        const execute = await areChangesSkippable(
          skippable,
          [],
          [getMockChangedFile('docs/index.js'), getMockChangedFile('README.md')]
        );

        expect(execute).toEqual(true);
      });

      it('when renamed files new and old locations are skippable', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/index.js', 'docs/old.js'),
          getMockChangedFile('README.md', 'DOCS.md'),
        ]);

        expect(execute).toEqual(true);
      });
    });
  });

  describe('upsertComment', () => {
    const client = getGithubClient();
    const paginate = jest.mocked(client.paginate);
    const { createComment, updateComment, deleteComment } = jest.mocked(client.issues);
    const marker = `<!-- ${KIBANA_COMMENT_SIGIL}:ctx -->`;
    const upsert = (opts: { clearPrevious: boolean; createIfMissing?: boolean }) =>
      upsertComment({ commentBody: 'new', commentContext: 'ctx', ...opts }, 'elastic', 'kibana', 1);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('posts a comment when there is none', async () => {
      paginate.mockResolvedValue([]);

      await upsert({ clearPrevious: false });

      expect(createComment).toHaveBeenCalledWith(
        expect.objectContaining({ issue_number: 1, body: `${marker}\nnew` })
      );
    });

    it('posts nothing when there is no comment and createIfMissing is false', async () => {
      paginate.mockResolvedValue([]);

      await upsert({ clearPrevious: false, createIfMissing: false });

      expect(createComment).not.toHaveBeenCalled();
      expect(updateComment).not.toHaveBeenCalled();
    });

    it('updates an existing comment in place when createIfMissing is false', async () => {
      paginate.mockResolvedValue([{ id: 7, body: `${marker}\nold` }]);

      await upsert({ clearPrevious: false, createIfMissing: false });

      expect(updateComment).toHaveBeenCalledWith(
        expect.objectContaining({ comment_id: 7, body: `${marker}\nnew` })
      );
      expect(deleteComment).not.toHaveBeenCalled();
      expect(createComment).not.toHaveBeenCalled();
    });
  });
});
