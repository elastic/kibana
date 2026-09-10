/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import nock from 'nock';

import { BuildkiteClient } from './client';
import {
  KIBANA_DISTRIBUTABLE_ARTIFACT,
  buildHasKibanaDistributable,
  createTimeBoundedClient,
  findBuildWithKibanaDistributable,
} from './kibana_distributable';
import type { Build } from './types/build';

const BASE_URL = 'https://api.buildkite.com';
const PIPELINE = 'kibana-on-merge';

const artifactsPath = (buildNumber: number) =>
  `/v2/organizations/elastic/pipelines/${PIPELINE}/builds/${buildNumber}/artifacts`;

const buildFixture = (number: number): Build => ({ id: `uuid-${number}`, number } as Build);

describe('kibana_distributable', () => {
  let client: BuildkiteClient;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    client = new BuildkiteClient({ baseUrl: BASE_URL, token: 'token' });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('buildHasKibanaDistributable', () => {
    it('matches the artifact by filename', async () => {
      nock(BASE_URL)
        .get(artifactsPath(1))
        .query({ per_page: 100 })
        .reply(200, [{ filename: 'junit.xml' }, { filename: KIBANA_DISTRIBUTABLE_ARTIFACT }]);

      await expect(buildHasKibanaDistributable(client, PIPELINE, 1)).resolves.toBe(true);
    });

    it('matches the artifact by path suffix', async () => {
      nock(BASE_URL)
        .get(artifactsPath(1))
        .query({ per_page: 100 })
        .reply(200, [{ filename: 'other', path: `target/${KIBANA_DISTRIBUTABLE_ARTIFACT}` }]);

      await expect(buildHasKibanaDistributable(client, PIPELINE, 1)).resolves.toBe(true);
    });

    it('returns false when the build has no distributable', async () => {
      nock(BASE_URL)
        .get(artifactsPath(1))
        .query({ per_page: 100 })
        .reply(200, [{ filename: 'junit.xml', path: 'target/junit.xml' }]);

      await expect(buildHasKibanaDistributable(client, PIPELINE, 1)).resolves.toBe(false);
    });

    it('returns false when the artifacts response is empty', async () => {
      nock(BASE_URL).get(artifactsPath(1)).query({ per_page: 100 }).reply(200, []);

      await expect(buildHasKibanaDistributable(client, PIPELINE, 1)).resolves.toBe(false);
    });
  });

  describe('findBuildWithKibanaDistributable', () => {
    it('returns the first build that still has the distributable', async () => {
      nock(BASE_URL).get(artifactsPath(3)).query({ per_page: 100 }).reply(200, []);
      nock(BASE_URL)
        .get(artifactsPath(2))
        .query({ per_page: 100 })
        .reply(200, [{ filename: KIBANA_DISTRIBUTABLE_ARTIFACT }]);

      const build = await findBuildWithKibanaDistributable(client, PIPELINE, [
        buildFixture(3),
        buildFixture(2),
        buildFixture(1),
      ]);

      expect(build?.number).toBe(2);
    });

    it('skips candidates whose artifact lookup fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      nock(BASE_URL).get(artifactsPath(2)).query({ per_page: 100 }).reply(500);
      nock(BASE_URL)
        .get(artifactsPath(1))
        .query({ per_page: 100 })
        .reply(200, [{ filename: KIBANA_DISTRIBUTABLE_ARTIFACT }]);

      const build = await findBuildWithKibanaDistributable(client, PIPELINE, [
        buildFixture(2),
        buildFixture(1),
      ]);

      expect(build?.number).toBe(1);
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(`Artifact lookup failed for ${PIPELINE} #2`)
      );

      consoleError.mockRestore();
    });

    it('returns null when no candidate has the distributable', async () => {
      nock(BASE_URL).get(artifactsPath(2)).query({ per_page: 100 }).reply(200, []);
      nock(BASE_URL).get(artifactsPath(1)).query({ per_page: 100 }).reply(200, []);

      await expect(
        findBuildWithKibanaDistributable(client, PIPELINE, [buildFixture(2), buildFixture(1)])
      ).resolves.toBeNull();
    });

    it('returns null without making requests for an empty candidate list', async () => {
      await expect(findBuildWithKibanaDistributable(client, PIPELINE, [])).resolves.toBeNull();
    });
  });

  describe('createTimeBoundedClient', () => {
    it('bounds requests with a default timeout', () => {
      expect(createTimeBoundedClient().http.defaults.timeout).toBe(30_000);
    });

    it('accepts an explicit timeout', () => {
      expect(createTimeBoundedClient(5_000).http.defaults.timeout).toBe(5_000);
    });
  });
});
