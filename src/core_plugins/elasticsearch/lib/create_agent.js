import url from 'url';
import { get } from 'lodash';
const readFile = (file) => require('fs').readFileSync(file, 'utf8');
import http from 'http';
import https from 'https';

import { parseConfig } from './parse_config';

export default function (config) {
  const target = url.parse(get(config, 'url'));

  if (!/^https/.test(target.protocol)) return new http.Agent();

  return new https.Agent(parseConfig(config).ssl);
}
