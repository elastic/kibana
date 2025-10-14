import packages from './search.json' assert { type: 'json' };
import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import fetch from 'node-fetch';

const downloadDir = path.resolve('./packages');

for (const pkg of packages) {
  const downloadSrc = `https://epr.elastic.co/${pkg.download}`;
  const downloadDest = path.join(downloadDir, pkg.version);
  await downloadAndUnzip(downloadSrc, downloadDest);
}

async function downloadAndUnzip(url, dest) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}`);

  const zipPath = `${dest}.zip`;
  const fileStream = createWriteStream(zipPath);
  await pipeline(response.body, fileStream);

  // await fs
  //   .createReadStream(zipPath)
  //   .pipe(unzipper.Extract({ path: dest }))
  //   .promise();

  // await fs.unlink(zipPath);
}
