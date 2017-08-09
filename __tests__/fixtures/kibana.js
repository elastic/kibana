import get from 'lodash';
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
      config: () => ({
        get: (key) => get(config, key),
      }),
      route: (def) => this.routes.push(def),
    };

    const { init } = this.props;

    this.init = () => init(this.server);
  }
}

export default {
  Plugin,
};
