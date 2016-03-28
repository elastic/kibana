import downloadHttpFile from './downloaders/http';
import downloadLocalFile from './downloaders/file';
import { parse } from 'url';

export function _downloadSingle(settings, logger, sourceUrl) {
  const urlInfo = parse(sourceUrl);
  let downloadPromise;

  if (/^file/.test(urlInfo.protocol)) {
    downloadPromise = downloadLocalFile(logger, decodeURI(urlInfo.path), settings.tempArchiveFile);
  } else {
    downloadPromise = downloadHttpFile(logger, sourceUrl, settings.tempArchiveFile, settings.timeout);
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
      if (err.message === 'ENOTFOUND') {
        return tryNext();
      }
      throw (err);
    });
  }

  return tryNext();
};
