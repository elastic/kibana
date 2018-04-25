import { openSync, writeSync, unlinkSync, closeSync } from 'fs';
import { dirname } from 'path';

import chalk from 'chalk';
import { createHash } from 'crypto';
import wreck from 'wreck';
import mkdirp from 'mkdirp';

function tryUnlink(path) {
  try {
    unlinkSync(path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function download(options) {
  const { log, url, destination, sha256, retries = 0 } = options;

  if (!sha256) {
    throw new Error(
      `sha256 checksum of ${url} not provided, refusing to download.`
    );
  }

  // mkdirp and open file outside of try/catch, we don't retry for those errors
  mkdirp.sync(dirname(destination));
  const fileHandle = openSync(destination, 'w');

  let error;
  try {
    log.debug(`Attempting download of ${url}`, chalk.dim(sha256));

    const request = wreck.request('GET', url);
    const response = await Promise.race([
      new Promise(resolve => request.once('response', resolve)),
      new Promise((resolve, reject) => request.once('error', reject)),
    ]);

    if (response.statusCode !== 200) {
      throw new Error(
        `Unexpected status code ${response.statusCode} when downloading ${url}`
      );
    }

    const hash = createHash('sha256');
    await new Promise((resolve, reject) => {
      response.on('data', chunk => {
        hash.update(chunk);
        writeSync(fileHandle, chunk);
      });

      response.on('error', reject);
      response.on('end', resolve);
    });

    const downloadedSha256 = hash.digest('hex');
    if (downloadedSha256 !== sha256) {
      throw new Error(
        `Downloaded checksum ${downloadedSha256} does not match the expected sha256 checksum.`
      );
    }
  } catch (_error) {
    error = _error;
  } finally {
    closeSync(fileHandle);
  }

  if (!error) {
    log.debug(`Downloaded ${url} and verified checksum`);
    return;
  }

  log.debug(`Download failed: ${error.message}`);

  // cleanup downloaded data and log error
  log.debug(`Deleting downloaded data at ${destination}`);
  tryUnlink(destination);

  // retry if we have retries left
  if (retries > 0) {
    log.debug(`Retrying - ${retries} attempt remaining`);
    return await download({
      ...options,
      retries: retries - 1,
    });
  }

  throw error;
}
