/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
// @ts-nocheck

import { createWriteStream } from 'fs';

import Wreck from '@hapi/wreck';
import HttpProxyAgent from 'http-proxy-agent';
import HttpsProxyAgent from 'https-proxy-agent';
// @ts-expect-error untyped module
import { getProxyForUrl } from 'proxy-from-env';

import { Progress } from '../progress';
import { Logger } from '../../../logger';

function getProxyAgent(sourceUrl: string, logger: Logger) {
  const proxy = getProxyForUrl(sourceUrl);

  if (!proxy) {
    return null;
  }

  logger.log(`Picked up proxy ${proxy} from environment variable.`);

  if (/^https/.test(sourceUrl)) {
    return new (HttpsProxyAgent as any)(proxy);
  } else {
    return new (HttpProxyAgent as any)(proxy);
  }
}

async function sendRequest(
  { sourceUrl, timeout }: { sourceUrl: string; timeout: number },
  logger: Logger
) {
  const maxRedirects = 11; //Because this one goes to 11.
  const reqOptions: any = { timeout, redirects: maxRedirects };
  const proxyAgent = getProxyAgent(sourceUrl, logger);

  if (proxyAgent) {
    reqOptions.agent = proxyAgent;
  }

  try {
    const promise: any = Wreck.request('GET', sourceUrl, reqOptions);
    const req = promise.req;
    const resp = await promise;
    if (resp.statusCode >= 400) {
      throw new Error('ENOTFOUND');
    }

    return { req, resp };
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED') {
      err = new Error('ENOTFOUND');
    }

    throw err;
  }
}

function downloadResponse({
  resp,
  targetPath,
  progress,
}: {
  resp: any;
  targetPath: string;
  progress: Progress;
}) {
  return new Promise<void>((resolve, reject) => {
    const writeStream = createWriteStream(targetPath);

    // if either stream errors, fail quickly
    resp.on('error', reject);
    writeStream.on('error', reject);

    // report progress as we download
    resp.on('data', (chunk: Buffer) => {
      progress.progress(chunk.length);
    });

    // write the download to the file system
    resp.pipe(writeStream);

    // when the write is done, we are done
    writeStream.on('finish', resolve);
  });
}

/*
Responsible for managing http transfers
*/
export async function downloadHttpFile(
  logger: Logger,
  sourceUrl: string,
  targetPath: string,
  timeout: number
) {
  try {
    const { req, resp } = await sendRequest({ sourceUrl, timeout }, logger);

    try {
      const totalSize = parseFloat(resp.headers['content-length']) || 0;
      const progress = new Progress(logger);
      progress.init(totalSize);

      await downloadResponse({ resp, targetPath, progress });

      progress.complete();
    } catch (err) {
      req.abort();
      throw err;
    }
  } catch (err: any) {
    if (err.message !== 'ENOTFOUND') {
      logger.error(err);
    }
    throw err;
  }
}
