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

import Wreck from 'wreck';
import Progress from '../progress';
import { fromNode as fn } from 'bluebird';
import { createWriteStream, unlink } from 'fs';
import HttpProxyAgent from 'http-proxy-agent';
import HttpsProxyAgent from 'https-proxy-agent';
import { getProxyForUrl } from 'proxy-from-env';
import crypto from 'crypto';

/**
 * List of supported checksum extensions in order of preference
 * This downloader will check to see if these sibling files exist
 * and if they do, verify the downloaded file matches the checksum.
 */
export const CHECKSUM_TYPES = [
  'sha512',
  'sha1',
  'md5'
];

function getProxyAgent(sourceUrl, logger) {
  const proxy = getProxyForUrl(sourceUrl);

  if (!proxy) {
    return null;
  }

  logger.log(`Picked up proxy ${proxy} from environment variable.`);

  if (/^https/.test(sourceUrl)) {
    return new HttpsProxyAgent(proxy);
  } else {
    return new HttpProxyAgent(proxy);
  }
}

function sendRequest({ sourceUrl, timeout }, logger) {
  const maxRedirects = 11; //Because this one goes to 11.
  return fn(cb => {
    const reqOptions = { timeout, redirects: maxRedirects };
    const proxyAgent = getProxyAgent(sourceUrl, logger);

    if (proxyAgent) {
      reqOptions.agent = proxyAgent;
    }

    const req = Wreck.request('GET', sourceUrl, reqOptions, (err, resp) => {
      if (err) {
        if (err.code === 'ECONNREFUSED') {
          err = new Error('ENOTFOUND');
        }

        return cb(err);
      }

      if (resp.statusCode >= 400) {
        return cb(new Error('ENOTFOUND'));
      }

      cb(null, { req, resp });
    });
  });
}

function downloadResponse({ resp, targetPath, progress, checksumDetails }, logger) {
  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(targetPath);
    // if we have available checksum, calculate a hash
    let hash;
    if (checksumDetails) {
      hash = crypto.createHash(checksumDetails.sumType);
    }

    // if either stream errors, fail quickly
    resp.on('error', reject);
    writeStream.on('error', reject);

    // report progress as we download
    resp.on('data', (chunk) => {
      progress.progress(chunk.length);
      if (hash) {
        hash.update(chunk);
      }
    });

    // write the download to the file system
    resp.pipe(writeStream);

    // when the write is done, we are done
    writeStream.on('finish', () => {
      // verify the checksum, if none exists, accept the download anyway
      const digest = hash ? hash.digest('hex') : null;

      if (digest === null) {
        logger.log(`No checksums found, skipping verfication`);
        resolve();
      } else if (digest === checksumDetails.checksum) {
        logger.log(`${checksumDetails.sumType} checksum matched downloaded file`);
        resolve();
      } else {
        // delete the file and reject the promise
        unlink(targetPath, () => {
          reject(new Error(`${checksumDetails.sumType} checksum does not match downloaded file`));
        });
      }
    });
  });
}


/**
 * Reads a readable stream to a string
 */
function readStreamToString(stream) {
  return new Promise((resolve, reject) => {
    let data = '';

    stream.on('data', function (chunk) {
      data += chunk;
    });

    stream.on('end', function () {
      resolve(data);
    });

    stream.on('error', reject);
  });
}


/**
 * Finds the first matching checksum on the server, if any. Returns the
 * checksum itself and the type found.
 */
async function getChecksumDetails({ sourceUrl, timeout }, logger) {
  for (const sumType of CHECKSUM_TYPES) {
    try {
      const url = `${sourceUrl}.${sumType}`;
      const { resp } = await sendRequest({ sourceUrl: url, timeout }, logger);

      // We got a match, return the payload and matching type.
      const checksum = await readStreamToString(resp);
      return { checksum, sumType };
    } catch (_) {
      // ignore and move on
    }
  }

  return null;
}

/**
 * Responsible for managing http transfers
 */
export default async function downloadUrl(logger, sourceUrl, targetPath, timeout) {
  try {
    const { req, resp } = await sendRequest({ sourceUrl, timeout }, logger);
    const checksumDetails = await getChecksumDetails({ sourceUrl, timeout }, logger);

    try {
      const totalSize = parseFloat(resp.headers['content-length']) || 0;
      const progress = new Progress(logger);
      progress.init(totalSize);

      await downloadResponse({ resp, targetPath, progress, checksumDetails }, logger);

      progress.complete();
    } catch (err) {
      req.abort();
      throw err;
    }
  } catch (err) {
    if (err.message !== 'ENOTFOUND') {
      logger.error(err);
    }
    throw err;
  }
}
