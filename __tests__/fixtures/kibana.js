export class Plugin {
  constructor(props) {
    this.props = props;
    this.routes = [];
    this.server = {
      plugins: {
        [this.props.name]: {},
      },
      route: (def) => this.routes.push(def),
    };

    const { init } = this.props;

    this.init = () => init(this.server);
  }
}

export default {
  Plugin,
};
