/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as glob from 'glob';
import axios from 'axios';

const CDN_URL_PREFIX = process.argv[2];
const CDN_ASSETS_FOLDER = process.argv[3];

async function main() {
  const allAssets = glob.sync('**/*', { cwd: CDN_ASSETS_FOLDER, nodir: true });
  const totalAssetCount = allAssets.length;
  let assetsProcessed = 0;
  let assetsFound = 0;

  const batchSize = 50;

  console.log(`Starting CDN asset validation for ${totalAssetCount} assets...`);

  while (assetsProcessed < totalAssetCount) {
    const batch = allAssets.slice(assetsProcessed, assetsProcessed + batchSize);
    const results = await Promise.all(batch.map((url) => headAssetUrlWithRetry(url)));
    assetsProcessed += results.length;
    results.forEach((result) => {
      if (result.status === 200) {
        console.log(`Testing ${result.assetPath}...${result.status}`);
        assetsFound++;
      } else {
        console.error(`Testing ${result.assetPath}...${result.status} (${result.testUrl})`);
      }
    });
  }

  return {
    totalAssetCount,
    assetsProcessed,
    assetsFound,
    assetsNotFound: totalAssetCount - assetsFound,
  };
}

async function headAssetUrl(assetPath: string) {
  const testUrl = `${CDN_URL_PREFIX}/${assetPath}`;
  try {
    const response = await axios.head(testUrl, {
      timeout: 1000,
    });
    return {
      status: response.status,
      testUrl,
      assetPath,
    };
  } catch (error) {
    return {
      status: error.response?.status || 0,
      testUrl,
      assetPath,
    };
  }
}

async function headAssetUrlWithRetry(
  assetPath: string,
  retries = 5
): Promise<{
  status: number;
  testUrl: string;
  assetPath: string;
}> {
  const result = await headAssetUrl(assetPath);
  if (result.status === 200) {
    return result;
  } else if (retries > 0) {
    console.log(`Retrying ${assetPath}...(retries left: ${retries})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return headAssetUrlWithRetry(assetPath, retries - 1);
  } else {
    return {
      status: result.status || 0,
      testUrl: result.testUrl,
      assetPath,
    };
  }
}

main()
  .then(({ totalAssetCount, assetsNotFound }) => {
    if (assetsNotFound) {
      console.error(`Couldn't find ${assetsNotFound} assets on CDN.`);
      process.exit(1);
    } else {
      console.log(`All ${totalAssetCount} found on CDN.`);
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
