import _ from 'lodash';
import downloadHttpFile from './downloaders/http';
import downloadLocalFile from './downloaders/file';
import { parse as urlParse } from 'url';

export default function createPluginDownloader(settings, logger) {
  let archiveType;
  let sourceType;

  //Attempts to download each url in turn until one is successful
  function download() {
    const urls = settings.urls.slice(0);

    function tryNext() {
      const sourceUrl = urls.shift();
      if (!sourceUrl) {
        throw new Error('No valid url specified.');
      }

      logger.log(`Attempting to transfer from ${sourceUrl}`);

      return downloadSingle(sourceUrl)
      .catch((err) => {
        if (err.message === 'ENOTFOUND') {
          return tryNext();
        }
        throw (err);
      });
    }

    return tryNext();
  }

  function downloadSingle(sourceUrl) {
    const urlInfo = urlParse(sourceUrl);
    let downloadPromise;

    if (/^file/.test(urlInfo.protocol)) {
      downloadPromise = downloadLocalFile(logger, urlInfo.path, settings.tempArchiveFile);
    } else {
      downloadPromise = downloadHttpFile(logger, sourceUrl, settings.tempArchiveFile, settings.timeout);
    }

    return downloadPromise;
  }

  return {
    download: download,
    _downloadSingle: downloadSingle
  };
};
