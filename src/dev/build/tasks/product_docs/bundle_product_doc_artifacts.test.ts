/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import { ToolingLog } from '@kbn/tooling-log';

import {
  BundleProductDocArtifacts,
  PRODUCT_DOC_ARTIFACTS_BUCKET_URL,
  PRODUCT_DOC_BUNDLED_ARTIFACTS_DIR,
} from './bundle_product_doc_artifacts';
import { Build, downloadToDisk, SERVERLESS_PLATFORMS, DOWNLOAD_PLATFORMS } from '../../lib';
import { getMockConfig } from '../../lib/__mocks__/get_config';

jest.mock('../../lib', () => {
  const actual = jest.requireActual('../../lib');
  return {
    ...actual,
    downloadToDisk: jest.fn(),
  };
});

const mockedDownloadToDisk = downloadToDisk as jest.MockedFunction<typeof downloadToDisk>;

const LISTING_URL = `${PRODUCT_DOC_ARTIFACTS_BUCKET_URL}/?max-keys=1000`;
const JINA_SUFFIX = '--.jina-embeddings-v5-text-small';
const E5_SUFFIX = '--.multilingual-e5-small-elasticsearch';
const PRODUCTS = ['kibana', 'elasticsearch', 'observability', 'security', 'openapi'];
// Jina (suffixed) and EIS ELSER (unsuffixed) variants, in bundling order
const PRODUCT_KEYS = [JINA_SUFFIX, ''].flatMap((suffix) =>
  PRODUCTS.map((product) => `kb-product-doc-${product}-latest${suffix}.zip`)
);
const NEWEST_SECURITY_LABS_KEYS = [
  `security-labs-2026.07.28-052323${JINA_SUFFIX}.zip`,
  'security-labs-2026.07.28-052323.zip',
];
const BUNDLED_KEYS = [...PRODUCT_KEYS, ...NEWEST_SECURITY_LABS_KEYS];

const contents = (key: string, lastModified: string) =>
  `<Contents><Key>${key}</Key><LastModified>${lastModified}</LastModified></Contents>`;

const listingXml = (entries: string[], { truncated = false } = {}) =>
  `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>bucket</Name><IsTruncated>${truncated}</IsTruncated>${entries.join(
    ''
  )}</ListBucketResult>`;

const fullListing = listingXml([
  contents(`kb-product-doc-kibana-9.7${JINA_SUFFIX}.zip`, '2026-01-01T00:00:00.000Z'),
  contents(`kb-product-doc-kibana-latest${E5_SUFFIX}.zip`, '2026-01-02T00:00:00.000Z'),
  ...PRODUCT_KEYS.map((key, i) =>
    contents(key, `2026-10-12T20:25:${String(i).padStart(2, '0')}.000Z`)
  ),
  contents(`security-labs-2026.07.10-152831${JINA_SUFFIX}.zip`, '2026-07-10T15:30:00.000Z'),
  contents('security-labs-2025.12.12.zip', '2025-12-12T00:00:00.000Z'),
  contents('security-labs-2026.07.28.zip', '2026-07-28T05:26:00.000Z'),
  ...NEWEST_SECURITY_LABS_KEYS.map((key) => contents(key, '2026-07-28T05:25:00.000Z')),
  contents(`security-labs-2026.08.01-000000${E5_SUFFIX}.zip`, '2026-08-01T00:00:00.000Z'),
]);

describe('BundleProductDocArtifacts', () => {
  const log = new ToolingLog();
  const config = getMockConfig();
  const build = new Build(config);
  let tmpDir: string;

  const platformDir = (platformName: string) =>
    Path.resolve(tmpDir, platformName, PRODUCT_DOC_BUNDLED_ARTIFACTS_DIR);

  const mockDownloads = (listing: string, failingKey?: string) => {
    mockedDownloadToDisk.mockImplementation(async ({ url, destination }) => {
      const key = url.slice(PRODUCT_DOC_ARTIFACTS_BUCKET_URL.length + 1);
      if (key === failingKey) {
        throw new Error('503 Service Unavailable');
      }
      Fs.mkdirSync(Path.dirname(destination), { recursive: true });
      Fs.writeFileSync(destination, url === LISTING_URL ? listing : `zip:${key}`);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'bundle-product-doc-artifacts-test-'));
    jest.spyOn(config, 'getTargetPlatforms').mockReturnValue([...SERVERLESS_PLATFORMS]);
    jest
      .spyOn(config, 'resolveFromRepo')
      .mockImplementation((...segments: string[]) => Path.resolve(tmpDir, ...segments));
    jest
      .spyOn(build, 'resolvePathForPlatform')
      .mockImplementation((platform, ...segments: string[]) =>
        Path.resolve(tmpDir, platform.toString(), ...segments)
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('skips when no serverless platform is targeted', async () => {
    jest.spyOn(config, 'getTargetPlatforms').mockReturnValue([...DOWNLOAD_PLATFORMS]);

    await BundleProductDocArtifacts.run(config, log, build);

    expect(mockedDownloadToDisk).not.toHaveBeenCalled();
  });

  it('downloads the latest product docs and newest Security Labs artifact of each bundled inference id from the storage bucket with retries', async () => {
    mockDownloads(fullListing);

    await BundleProductDocArtifacts.run(config, log, build);

    const urls = mockedDownloadToDisk.mock.calls.map(([{ url }]) => url);
    expect(urls).toEqual([
      LISTING_URL,
      ...BUNDLED_KEYS.map((key) => `${PRODUCT_DOC_ARTIFACTS_BUCKET_URL}/${key}`),
    ]);
    for (const [options] of mockedDownloadToDisk.mock.calls) {
      expect(options).toMatchObject({ maxAttempts: 3, skipChecksumCheck: true });
    }
  });

  it('writes the artifacts and an index.xml with the bucket LastModified into every serverless platform', async () => {
    mockDownloads(fullListing);

    await BundleProductDocArtifacts.run(config, log, build);

    for (const platform of SERVERLESS_PLATFORMS) {
      const dir = platformDir(platform.toString());
      expect(Fs.readdirSync(dir).sort()).toEqual([...BUNDLED_KEYS, 'index.xml'].sort());
      expect(Fs.readFileSync(Path.resolve(dir, PRODUCT_KEYS[0]), 'utf8')).toBe(
        `zip:${PRODUCT_KEYS[0]}`
      );
      expect(Fs.readFileSync(Path.resolve(dir, 'index.xml'), 'utf8')).toMatchSnapshot();
    }
  });

  it('fails when a product documentation artifact is missing from the bucket', async () => {
    mockDownloads(
      listingXml([
        ...PRODUCT_KEYS.slice(1).map((key) => contents(key, '2026-10-12T20:25:34.000Z')),
        ...NEWEST_SECURITY_LABS_KEYS.map((key) => contents(key, '2026-07-28T05:25:00.000Z')),
      ])
    );

    await expect(BundleProductDocArtifacts.run(config, log, build)).rejects.toThrow(
      `Product documentation artifact [${PRODUCT_KEYS[0]}] not found`
    );
    expect(mockedDownloadToDisk).toHaveBeenCalledTimes(1);
  });

  it('fails when no Security Labs artifact for a bundled inference id is in the bucket', async () => {
    mockDownloads(
      listingXml([
        ...PRODUCT_KEYS.map((key) => contents(key, '2026-10-12T20:25:34.000Z')),
        contents(NEWEST_SECURITY_LABS_KEYS[0], '2026-07-28T05:25:00.000Z'),
        contents(`security-labs-2026.08.01-000000${E5_SUFFIX}.zip`, '2026-08-01T00:00:00.000Z'),
      ])
    );

    await expect(BundleProductDocArtifacts.run(config, log, build)).rejects.toThrow(
      'No Security Labs artifact for [.elser-2-elasticsearch] found'
    );
  });

  it('fails when the bucket listing is truncated', async () => {
    mockDownloads(listingXml([], { truncated: true }));

    await expect(BundleProductDocArtifacts.run(config, log, build)).rejects.toThrow('is truncated');
  });

  it('fails with the artifact name when a download fails', async () => {
    mockDownloads(fullListing, PRODUCT_KEYS[2]);

    await expect(BundleProductDocArtifacts.run(config, log, build)).rejects.toThrow(
      `Failed to download product documentation artifact ${PRODUCT_KEYS[2]}: 503 Service Unavailable`
    );
  });
});
