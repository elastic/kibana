import Wreck from 'wreck';
import Progress from '../progress';
import { fromNode as fn } from 'bluebird';
import { createWriteStream } from 'fs';

function sendRequest({ sourceUrl, timeout }) {
  const maxRedirects = 11; //Because this one goes to 11.
  return fn(cb => {
    const req = Wreck.request('GET', sourceUrl, { timeout, redirects: maxRedirects }, (err, resp) => {
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
export default async function downloadUrl(logger, sourceUrl, targetPath, timeout) {
  try {
    const { req, resp } = await sendRequest({ sourceUrl, timeout });

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
  } catch (err) {
    if (err.message !== 'ENOTFOUND') {
      logger.error(err);
    }
    throw err;
  }
};
