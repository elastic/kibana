/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ToolingLog } from '@kbn/dev-utils';
jest.mock('node-fetch');
import fetch from 'node-fetch';
const { Response } = jest.requireActual('node-fetch');

import { Artifact } from './artifact';

const log = new ToolingLog();
let MOCKS;

const PLATFORM = process.platform === 'win32' ? 'windows' : process.platform;
const ARCHITECTURE = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
const MOCK_VERSION = 'test-version';
const MOCK_URL = 'http://127.0.0.1:12345';
const MOCK_FILENAME = 'test-filename';

const DAILY_SNAPSHOT_BASE_URL = 'https://storage.googleapis.com/kibana-ci-es-snapshots-daily';
const PERMANENT_SNAPSHOT_BASE_URL =
  'https://storage.googleapis.com/kibana-ci-es-snapshots-permanent';

const createArchive = (params = {}) => {
  const license = params.license || 'default';
  const architecture = params.architecture || ARCHITECTURE;

  return {
    license: 'default',
    architecture,
    version: MOCK_VERSION,
    url: MOCK_URL + `/${license}`,
    platform: PLATFORM,
    filename: MOCK_FILENAME + `-${architecture}.${license}`,
    ...params,
  };
};

const mockFetch = (mock) =>
  fetch.mockReturnValue(Promise.resolve(new Response(JSON.stringify(mock))));

const previousEnvVars = {};
const ENV_VARS_TO_RESET = ['ES_SNAPSHOT_MANIFEST', 'KBN_ES_SNAPSHOT_USE_UNVERIFIED'];

beforeAll(() => {
  ENV_VARS_TO_RESET.forEach((key) => {
    if (key in process.env) {
      previousEnvVars[key] = process.env[key];
      delete process.env[key];
    }
  });
});

afterAll(() => {
  Object.keys(previousEnvVars).forEach((key) => {
    process.env[key] = previousEnvVars[key];
  });
});

beforeEach(() => {
  jest.resetAllMocks();

  MOCKS = {
    valid: {
      archives: [createArchive({ license: 'oss' }), createArchive({ license: 'default' })],
    },
    multipleArch: {
      archives: [
        createArchive({ architecture: 'fake_arch', license: 'oss' }),
        createArchive({ architecture: ARCHITECTURE, license: 'oss' }),
      ],
    },
  };
});

const artifactTest = (requestedLicense, expectedLicense, fetchTimesCalled = 1) => {
  return async () => {
    const artifact = await Artifact.getSnapshot(requestedLicense, MOCK_VERSION, log);
    expect(fetch).toHaveBeenCalledTimes(fetchTimesCalled);
    expect(fetch.mock.calls[0][0]).toEqual(
      `${DAILY_SNAPSHOT_BASE_URL}/${MOCK_VERSION}/manifest-latest-verified.json`
    );
    if (fetchTimesCalled === 2) {
      expect(fetch.mock.calls[1][0]).toEqual(
        `${PERMANENT_SNAPSHOT_BASE_URL}/${MOCK_VERSION}/manifest.json`
      );
    }
    expect(artifact.getUrl()).toEqual(MOCK_URL + `/${expectedLicense}`);
    expect(artifact.getChecksumUrl()).toEqual(MOCK_URL + `/${expectedLicense}.sha512`);
    expect(artifact.getChecksumType()).toEqual('sha512');
    expect(artifact.getFilename()).toEqual(MOCK_FILENAME + `-${ARCHITECTURE}.${expectedLicense}`);
  };
};

describe('Artifact', () => {
  describe('getSnapshot()', () => {
    describe('with default snapshot', () => {
      beforeEach(() => {
        mockFetch(MOCKS.valid);
      });

      it('should return artifact metadata for a daily oss artifact', artifactTest('oss', 'oss'));

      it(
        'should return artifact metadata for a daily default artifact',
        artifactTest('default', 'default')
      );

      it(
        'should default to default license with anything other than "oss"',
        artifactTest('INVALID_LICENSE', 'default')
      );

      it('should throw when an artifact cannot be found in the manifest for the specified parameters', async () => {
        await expect(Artifact.getSnapshot('default', 'INVALID_VERSION', log)).rejects.toThrow(
          "couldn't find an artifact"
        );
      });
    });

    describe('with missing default snapshot', () => {
      beforeEach(() => {
        fetch.mockReturnValueOnce(Promise.resolve(new Response('', { status: 404 })));
        mockFetch(MOCKS.valid);
      });

      it(
        'should return artifact metadata for a permanent oss artifact',
        artifactTest('oss', 'oss', 2)
      );

      it(
        'should return artifact metadata for a permanent default artifact',
        artifactTest('default', 'default', 2)
      );

      it(
        'should default to default license with anything other than "oss"',
        artifactTest('INVALID_LICENSE', 'default', 2)
      );

      it('should throw when an artifact cannot be found in the manifest for the specified parameters', async () => {
        await expect(Artifact.getSnapshot('default', 'INVALID_VERSION', log)).rejects.toThrow(
          "couldn't find an artifact"
        );
      });
    });

    describe('with snapshots for multiple architectures', () => {
      beforeEach(() => {
        mockFetch(MOCKS.multipleArch);
      });

      it('should return artifact metadata for the correct architecture', async () => {
        const artifact = await Artifact.getSnapshot('oss', MOCK_VERSION, log);
        expect(artifact.getFilename()).toEqual(MOCK_FILENAME + `-${ARCHITECTURE}.oss`);
      });
    });

    describe('with custom snapshot manifest URL', () => {
      const CUSTOM_URL = 'http://www.creedthoughts.gov.www/creedthoughts';

      beforeEach(() => {
        process.env.ES_SNAPSHOT_MANIFEST = CUSTOM_URL;
        mockFetch(MOCKS.valid);
      });

      it('should use the custom URL when looking for a snapshot', async () => {
        await Artifact.getSnapshot('oss', MOCK_VERSION, log);
        expect(fetch.mock.calls[0][0]).toEqual(CUSTOM_URL);
      });

      afterEach(() => {
        delete process.env.ES_SNAPSHOT_MANIFEST;
      });
    });

    describe('with latest unverified snapshot', () => {
      beforeEach(() => {
        process.env.KBN_ES_SNAPSHOT_USE_UNVERIFIED = 1;
        mockFetch(MOCKS.valid);
      });

      it('should use the daily unverified URL when looking for a snapshot', async () => {
        await Artifact.getSnapshot('oss', MOCK_VERSION, log);
        expect(fetch.mock.calls[0][0]).toEqual(
          `${DAILY_SNAPSHOT_BASE_URL}/${MOCK_VERSION}/manifest-latest.json`
        );
      });

      afterEach(() => {
        delete process.env.KBN_ES_SNAPSHOT_USE_UNVERIFIED;
      });
    });
  });
});
