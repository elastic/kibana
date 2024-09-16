/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RestEndpointMethodTypes } from '@octokit/rest';
import { expect } from 'chai';
import { areChangesSkippable, doAnyChangesMatch } from './github';

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

        expect(match).to.eql(true);
      });

      it('when all files match', async () => {
        const match = await doAnyChangesMatch(required, [
          getMockChangedFile('/required/index.js'),
          getMockChangedFile('/required/package.json'),
        ]);

        expect(match).to.eql(true);
      });
    });

    describe('should return false', () => {
      it('when no files match with one file', async () => {
        const match = await doAnyChangesMatch(required, [getMockChangedFile('/index.js')]);

        expect(match).to.eql(false);
      });

      it('when no files match with multiple files', async () => {
        const match = await doAnyChangesMatch(required, [
          getMockChangedFile('/index.js'),
          getMockChangedFile('/package.json'),
        ]);

        expect(match).to.eql(false);
      });
    });
  });

  describe.skip('areChangesSkippable', () => {
    const skippable = [/^docs\//, /^rfcs\//, /\.md$/];
    const required = [/required\.md$/];

    describe('should not be skippable', () => {
      it('when non-skippable files are present', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/required.md'),
          getMockChangedFile('package.json'),
        ]);

        expect(execute).to.eql(false);
      });

      it('when all files are non-skippable, non-required', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('package.json'),
        ]);

        expect(execute).to.eql(false);
      });

      it('when a required file is present', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/required.md'),
          getMockChangedFile('docs/whatever.md'),
        ]);

        expect(execute).to.eql(false);
      });

      it('when a required file is renamed', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/skipme.md', 'docs/required.md'),
        ]);

        expect(execute).to.eql(false);
      });
    });

    describe('should be skippable', () => {
      it('when all files are skippable', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/index.js'),
          getMockChangedFile('README.md'),
        ]);

        expect(execute).to.eql(true);
      });

      it('when all files are skippable and no required files are passed in', async () => {
        const execute = await areChangesSkippable(
          skippable,
          [],
          [getMockChangedFile('docs/index.js'), getMockChangedFile('README.md')]
        );

        expect(execute).to.eql(true);
      });

      it('when renamed files new and old locations are skippable', async () => {
        const execute = await areChangesSkippable(skippable, required, [
          getMockChangedFile('docs/index.js', 'docs/old.js'),
          getMockChangedFile('README.md', 'DOCS.md'),
        ]);

        expect(execute).to.eql(true);
      });
    });
  });
});
