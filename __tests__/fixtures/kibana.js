import { get, has, noop } from 'lodash';
import mockElasticsearch from './elasticsearch_plugin';

const config = {
  canvas: {
    enabled: true,
    indexPrefix: '.canvas',
  },
};

export class Plugin {
  constructor(props) {
    this.props = props;
    this.routes = [];
    this.server = {
      plugins: {
        [this.props.name]: {},
        elasticsearch: mockElasticsearch,
      },
      injectUiAppVars: noop,
      config: () => ({
        get: key => get(config, key),
        has: key => has(config, key),
      }),
      route: def => this.routes.push(def),
      usage: {
        collectorSet: {
          makeUsageCollector: () => {},
          register: () => {},
        },
      },
    };

    const { init } = this.props;

    this.init = () => init(this.server);
  }
}

export default {
  Plugin,
};
