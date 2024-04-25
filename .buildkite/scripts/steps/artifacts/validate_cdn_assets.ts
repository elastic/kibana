/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as glob from 'glob';
import axios from 'axios';

const GCS_SA_CDN_URL = process.argv[2];
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
    const results = await Promise.all(batch.map(headAssetUrl));
    assetsProcessed += results.length;
    results.forEach((result) => {
      if (result.status === 200) {
        console.log(`Testing ${result.assetPath}...${result.status}`);
        assetsFound++;
      } else {
        console.error(`Testing ${result.assetPath}...${result.status}`);
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
  const response = await axios.head(`${GCS_SA_CDN_URL}/${assetPath}`);
  return {
    status: response.status,
    assetPath,
  };
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
