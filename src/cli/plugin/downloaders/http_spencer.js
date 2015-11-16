const { fromNode: fn } = require('bluebird');
const { createWriteStream, unlinkSync } = require('fs');
const Wreck = require('wreck');
const getProgressReporter = require('../progressReporter');

function sendRequest({ sourceUrl, timeout }) {
  return fn(cb => {
    const req = Wreck.request('GET', sourceUrl, { timeout }, (err, resp) => {
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

async function downloadResponse(resp, targetPath, progressReporter) {
  const writeStream = createWriteStream(targetPath);
  const writeClosed = fn(cb => writeStream.on('close', cb));

  try {
    await new Promise((resolve, reject) => {
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
      writeStream.on('close', resolve);
    });
  } catch (err) {
    // once the writeStream is closed, remove the file
    // it wrote and rethrow the error
    writeStream.close();
    await writeClosed;
    unlinkSync(targetPath);
    throw err;
  }
}

function getArchiveTypeFromResponse(resp) {
  const contentType = (resp.headers['content-type'] || '');
  switch (contentType.toLowerCase()) {
    case 'application/zip': return '.zip';
    case 'application/x-gzip': return '.tar.gz';
  }
}

/*
Responsible for managing http transfers
*/
export default async function downloadUrl(logger, sourceUrl, targetPath, timeout) {
  console.log(`downloading '${sourceUrl}`);
  try {
    const { req, resp } = await sendRequest({ sourceUrl, timeout});

    try {
      let totalSize = parseFloat(resp.headers['content-length']) || 0;
      const progressReporter = getProgressReporter(logger);
      progressReporter.init(totalSize);

      await downloadResponse(resp, targetPath, progressReporter);
    } catch (err) {
      req.abort();
      throw err;
    }

    // all is well, return our archive type
    const archiveType = getArchiveTypeFromResponse(resp);
    return { archiveType };
  } catch (err) {
    logger.error(err);
    throw err;
  }
};
