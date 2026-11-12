/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { parseStringPromise } from 'xml2js';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  DocumentationProduct,
  getArtifactName,
  getSecurityLabsArtifactName,
  parseSecurityLabsArtifactName,
  type ProductName,
} from '@kbn/product-doc-common';
import type { ToolingLog } from '@kbn/tooling-log';

import type { Task } from '../../lib';
import { copyAll, downloadToDisk, read, write } from '../../lib';

// Same bucket as https://kibana-knowledge-base-artifacts.elastic.co, read directly from
// storage so build agents (in GCP) do not generate CDN egress.
export const PRODUCT_DOC_ARTIFACTS_BUCKET_URL =
  'https://storage.googleapis.com/kibana-ai-assistant-kb-artifacts';

// Resolved at runtime by the product_doc_base plugin relative to its own install location
export const PRODUCT_DOC_BUNDLED_ARTIFACTS_DIR =
  'node_modules/@kbn/product-doc-base-plugin/target/bundled_artifacts';

// Inference IDs serverless resolves the default to; the ELSER one maps to the unsuffixed artifacts
const BUNDLED_INFERENCE_IDS = [defaultInferenceEndpoints.JINAv5, defaultInferenceEndpoints.ELSER];
const PRODUCT_DOC_LATEST_VERSION = 'latest';
const PRODUCT_DOC_PRODUCTS: ProductName[] = [
  ...Object.values(DocumentationProduct),
  'openapi' as ProductName,
];
const DOWNLOAD_MAX_ATTEMPTS = 3;

interface BucketObject {
  key: string;
  lastModified: string;
}

interface ListBucketResult {
  ListBucketResult?: {
    IsTruncated?: string[];
    Contents?: Array<{ Key?: string[]; LastModified?: string[] }>;
  };
}

const download = async (log: ToolingLog, url: string, destination: string): Promise<void> => {
  await downloadToDisk({
    log,
    url,
    destination,
    shaChecksum: '',
    shaAlgorithm: 'sha512',
    skipChecksumCheck: true,
    maxAttempts: DOWNLOAD_MAX_ATTEMPTS,
  });
};

const fetchBucketListing = async (
  log: ToolingLog,
  listingPath: string
): Promise<BucketObject[]> => {
  await download(log, `${PRODUCT_DOC_ARTIFACTS_BUCKET_URL}/?max-keys=1000`, listingPath);
  const parsed: ListBucketResult = await parseStringPromise(await read(listingPath));
  const result = parsed.ListBucketResult;
  if (!result) {
    throw new Error(`Unexpected bucket listing from [${PRODUCT_DOC_ARTIFACTS_BUCKET_URL}]`);
  }
  if (result.IsTruncated?.includes('true')) {
    throw new Error(
      `Bucket listing from [${PRODUCT_DOC_ARTIFACTS_BUCKET_URL}] is truncated, cannot select artifacts`
    );
  }
  return (result.Contents ?? []).flatMap((entry) => {
    const key = entry.Key?.[0];
    const lastModified = entry.LastModified?.[0];
    return key && lastModified ? [{ key, lastModified }] : [];
  });
};

const selectProductDocArtifacts = (listing: BucketObject[]): BucketObject[] =>
  BUNDLED_INFERENCE_IDS.flatMap((inferenceId) =>
    PRODUCT_DOC_PRODUCTS.map((productName) => {
      const key = getArtifactName({
        productName,
        productVersion: PRODUCT_DOC_LATEST_VERSION,
        inferenceId,
      });
      const object = listing.find((entry) => entry.key === key);
      if (!object) {
        throw new Error(
          `Product documentation artifact [${key}] not found in [${PRODUCT_DOC_ARTIFACTS_BUCKET_URL}]`
        );
      }
      return object;
    })
  );

const selectSecurityLabsArtifacts = (listing: BucketObject[]): BucketObject[] =>
  BUNDLED_INFERENCE_IDS.map((inferenceId) => {
    const candidates = listing.flatMap((object) => {
      const parsed = parseSecurityLabsArtifactName(object.key);
      if (!parsed) {
        return [];
      }
      const expectedKey = getSecurityLabsArtifactName({ version: parsed.version, inferenceId });
      return object.key === expectedKey ? [{ ...object, version: parsed.version }] : [];
    });
    const newest = candidates.sort((a, b) => b.version.localeCompare(a.version))[0];
    if (!newest) {
      throw new Error(
        `No Security Labs artifact for [${inferenceId}] found in [${PRODUCT_DOC_ARTIFACTS_BUCKET_URL}]`
      );
    }
    return { key: newest.key, lastModified: newest.lastModified };
  });

// Mirrors the GCS ListBucketResult format the plugin parses for remote repositories
const renderIndexXml = (objects: BucketObject[]): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ListBucketResult>',
    '  <Name>kibana-ai-assistant-kb-artifacts</Name>',
    '  <IsTruncated>false</IsTruncated>',
    ...objects.flatMap(({ key, lastModified }) => [
      '  <Contents>',
      `    <Key>${key}</Key>`,
      `    <LastModified>${lastModified}</LastModified>`,
      '  </Contents>',
    ]),
    '</ListBucketResult>',
    '',
  ].join('\n');

export const BundleProductDocArtifacts: Task = {
  description: 'Bundling AI Assistant product documentation artifacts into serverless builds',

  async run(config, log, build) {
    const serverlessPlatforms = config
      .getTargetPlatforms()
      .filter((platform) => platform.isServerless());
    if (serverlessPlatforms.length === 0) {
      log.info('No serverless platform targeted, skipping product documentation bundling');
      return;
    }

    const listing = await fetchBucketListing(
      log,
      config.resolveFromRepo('build', 'product_doc_artifacts_listing.xml')
    );
    const artifacts = [
      ...selectProductDocArtifacts(listing),
      ...selectSecurityLabsArtifacts(listing),
    ];

    const [firstPlatform, ...otherPlatforms] = serverlessPlatforms;
    const bundleDir = build.resolvePathForPlatform(
      firstPlatform,
      PRODUCT_DOC_BUNDLED_ARTIFACTS_DIR
    );

    for (const { key } of artifacts) {
      log.info(`Downloading product documentation artifact ${key}`);
      try {
        await download(
          log,
          `${PRODUCT_DOC_ARTIFACTS_BUCKET_URL}/${key}`,
          Path.resolve(bundleDir, key)
        );
      } catch (error) {
        throw new Error(
          `Failed to download product documentation artifact ${key}: ${error.message}`
        );
      }
    }
    await write(Path.resolve(bundleDir, 'index.xml'), renderIndexXml(artifacts));

    for (const platform of otherPlatforms) {
      await copyAll(
        bundleDir,
        build.resolvePathForPlatform(platform, PRODUCT_DOC_BUNDLED_ARTIFACTS_DIR)
      );
    }

    log.info(
      `Bundled ${artifacts.length} product documentation artifacts for ${serverlessPlatforms
        .map((platform) => platform.toString())
        .join(', ')}`
    );
  },
};
