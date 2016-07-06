import { defaultsDeep } from 'lodash'

import { ProxyConfig } from './proxy_config'
import { parse as parseUrl } from 'url'


export class ProxyConfigCollection {
  constructor(configs = []) {
    this.configs = configs.map(settings => new ProxyConfig(settings))
  }

  configForUri(uri) {
    const parsedUri = parseUrl(uri);
    const settings = this.configs.map(config => config.getForParsedUri(parsedUri));
    return defaultsDeep({}, ...settings);
  }
}
