import Progress from '../progress';
import { fromNode as fn } from 'bluebird';
import Request from 'request';
import { createWriteStream, unlinkSync } from 'fs';

function sendRequest({ sourceUrl, reqOptions }) {
  return new Promise((resolve, reject) => {
    const req = Request.get(sourceUrl, reqOptions);

    req.on('response', (resp) => {
      if (resp.statusCode >= 400) {
        return reject(new Error('ENOTFOUND'));
      }
      return resolve({ req, resp });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        err = new Error('ENOTFOUND');
      }
      return reject(err);
    });
  });
}

function downloadResponse({ resp, targetPath, progress }) {
  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(targetPath);

    // if either stream errors, fail quickly
    resp.on('error', reject);
    writeStream.on('error', reject);

    // report progress as we download
    resp.on('data', (chunk) => {
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
export default async function downloadUrl(logger, sourceUrl, targetPath, timeout, proxy) {
  let reqOptions = {
    'timeout': timeout,
    'maxRedirects': 11, //Because this one goes to 11.
    'encoding': null
  };

  if (proxy) {
    reqOptions.proxy = proxy;
    logger.log(`Attempting to use the following proxy: ${proxy}`);
  }

  try {
    const { req, resp } = await sendRequest({ sourceUrl, reqOptions });

    try {
      let totalSize = parseFloat(resp.headers['content-length']) || 0;
      const progress = new Progress(logger);
      progress.init(totalSize);

      await downloadResponse({ resp, targetPath, progress });

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
};
