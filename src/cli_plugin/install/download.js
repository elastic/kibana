import downloadHttpFile from './downloaders/http';
import downloadLocalFile from './downloaders/file';
import { UnsupportedProtocolError } from '../lib/errors';
import { parse } from 'url';

export function _downloadSingle(settings, logger, sourceUrl) {
  const urlInfo = parse(sourceUrl);
  let downloadPromise;

  if (/^file/.test(urlInfo.protocol)) {
    downloadPromise = downloadLocalFile(logger, decodeURI(urlInfo.path), settings.tempArchiveFile);
  } else if (/^https?/.test(urlInfo.protocol)) {
    downloadPromise = downloadHttpFile(logger, sourceUrl, settings.tempArchiveFile, settings.timeout);
  } else {
    downloadPromise = Promise.reject(new UnsupportedProtocolError());
  }

  return downloadPromise;
}

//Attempts to download each url in turn until one is successful
export function download(settings, logger) {
  const urls = settings.urls.slice(0);

  function tryNext() {
    const sourceUrl = urls.shift();
    if (!sourceUrl) {
      throw new Error('No valid url specified.');
    }

    logger.log(`Attempting to transfer from ${sourceUrl}`);

    return _downloadSingle(settings, logger, sourceUrl)
    .catch((err) => {
      const isUnsupportedProtocol = err instanceof UnsupportedProtocolError;
      const isDownloadResourceNotFound = err.message === 'ENOTFOUND';
      if (isUnsupportedProtocol || isDownloadResourceNotFound) {
        return tryNext();
      }
      throw (err);
    });
  }

  return tryNext();
};
