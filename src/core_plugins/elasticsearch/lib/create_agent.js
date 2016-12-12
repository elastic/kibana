import url from 'url';
import { get, size } from 'lodash';
const readFile = (file) => require('fs').readFileSync(file, 'utf8');
import http from 'http';
import https from 'https';

export default function (config) {
  const target = url.parse(get(config, 'url'));

  if (!/^https/.test(target.protocol)) return new http.Agent();

  const agentOptions = {
    rejectUnauthorized: get(config, 'ssl.verify')
  };

  if (size(get(config, 'ssl.ca'))) {
    agentOptions.ca = get(config, 'ssl.ca').map(readFile);
  }

  // Add client certificate and key if required by elasticsearch
  if (get(config, 'ssl.cert') && get(config, 'ssl.key')) {
    agentOptions.cert = readFile(get(config, 'ssl.cert'));
    agentOptions.key = readFile(get(config, 'ssl.key'));
  }

  return new https.Agent(agentOptions);
};
