import Wreck from 'wreck';
import Progress from '../progress';
import { fromNode as fn } from 'bluebird';
import { createWriteStream } from 'fs';
import HttpProxyAgent from 'http-proxy-agent';
import URL from 'url';

function getProxyAgent(sourceUrl, logger) {
  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  // we have a proxy detected, lets use it
  if (httpProxy) {
    logger.log(`Picked up proxy ${httpProxy} from http_proxy environment variable.`);
    // get the hostname of the sourceUrl
    const hostname = URL.parse(sourceUrl).hostname;
    const noProxy = process.env.no_proxy || process.env.NO_PROXY || '';
    const excludedHosts = noProxy.split(',');

    // proxy if the hostname is not in noProxy
    const shouldProxy = !excludedHosts.includes(hostname);

    if (shouldProxy) {
      logger.log(`Using proxy to download plugin.`);
      logger.log(`Hint: you can add ${hostname} to the no_proxy environment variable, `
        + `to exclude that host from proxying.`);
      return new HttpProxyAgent(httpProxy);
    } else {
      logger.log(`Found exception for host ${hostname} in no_proxy environment variable. `
        + `Skipping proxy.`);
    }
  }

  return null;
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
  } catch (err) {
    if (err.message !== 'ENOTFOUND') {
      logger.error(err);
    }
    throw err;
  }
};
