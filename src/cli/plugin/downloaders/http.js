import Wreck from 'wreck';
import getProgressReporter from '../progress_reporter';
import { fromNode as fn } from 'bluebird';
import { createWriteStream, unlinkSync } from 'fs';
import fileType, { ZIP, TAR } from '../file_type';

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

function downloadResponse({ resp, targetPath, progressReporter }) {
  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(targetPath);

    // if either stream errors, fail quickly
    resp.on('error', reject);
    writeStream.on('error', reject);

    // report progress as we download
    resp.on('data', (chunk) => {
      progressReporter.progress(chunk.length);
    });

    // write the download to the file system
    resp.pipe(writeStream);

    // when the write is done, we are done
    writeStream.on('finish', resolve);
  });
}

function getArchiveTypeFromResponse(resp, sourceUrl) {
  const contentType = (resp.headers['content-type'] || '');

  switch (contentType.toLowerCase()) {
    case 'application/zip': return ZIP;
    case 'application/x-gzip': return TAR;
    default:
      //If we can't infer the archive type from the content-type header,
      //fall back to checking the extension in the url
      return fileType(sourceUrl);
  }
}

/*
Responsible for managing http transfers
*/
export default async function downloadUrl(logger, sourceUrl, targetPath, timeout) {
  try {
    const { req, resp } = await sendRequest({ sourceUrl, timeout });

    try {
      let totalSize = parseFloat(resp.headers['content-length']) || 0;
      const progressReporter = getProgressReporter(logger);
      progressReporter.init(totalSize);

      await downloadResponse({ resp, targetPath, progressReporter });

      progressReporter.complete();
    } catch (err) {
      req.abort();
      throw err;
    }

    // all is well, return our archive type
    const archiveType = getArchiveTypeFromResponse(resp, sourceUrl);
    return { archiveType };
  } catch (err) {
    if (err.message !== 'ENOTFOUND') {
      logger.error(err);
    }
    throw err;
  }
};
