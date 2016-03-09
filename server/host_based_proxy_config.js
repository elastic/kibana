import { defaultsDeep, memoize, values } from 'lodash'
import { Agent as HttpAgent } from 'http'
import { Agent as HttpsAgent } from 'https'
import { readFileSync } from 'lodash'
import { parse as parseUrl } from 'url'

const makeHttpsAgent = memoize(
  opts => new HttpsAgent(opts),
  opts => JSON.stringify(opts)
)

export class HostBasedProxyConfig {
  constructor(config) {
    config = Object.assign({}, config);

    this.host = config.host;
    this.re = new RegExp(this.host);

    const ssl = config.ssl || {};
    this.verifySsl = ssl.verify;

    const sslAgentOpts = {
      ca: ssl.ca && readFileSync(ssl.ca),
      cert: ssl.cert && readFileSync(ssl.cert),
      key: ssl.key && readFileSync(ssl.key),
    };

    if (values(sslAgentOpts).filter(Boolean).length) {
      this.sslAgent = new HttpsAgent(sslAgentOpts);
    }
  }

  getSettings({ protocol, host }) {
    if (!this.re.test(`${protocol}//${host}`)) return {};
    return {
      rejectUnauthorized: this.verifySsl,
      agent: protocol === 'https:' ? this.sslAgent : undefined
    };
  }
}


export class HostBasedProxyConfigCollection {
  constructor(hosts = []) {
    this.hosts = hosts.map(settings => new HostBasedProxyConfig(settings))
  }

  forUri(uri) {
    const parsedUri = parseUrl(uri);
    const settings = this.hosts.map(host => host.getSettings(parsedUri));
    return defaultsDeep({}, ...settings);
  }
}
