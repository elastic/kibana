export default class FrameSource {
  constructor(name, props) {
    this.name = name;
    this.displayName = props.displayName;
    this.help = props.help;

    // A React element, either a react class or a stateless function
    this.form = props.form;

    // The properties used as defaults for the form
    this.defaults = props.defaults;

    // The function for turning the inputs into a dataframe.
    // Note that you should return the POJO for now, not a dataframe object.
    // You can return a promise here
    // 'app' can be used to access app meta data in the store, such as basePath
    this.toDataframe = props.toDataframe || function (value, app) {return value;};

  }
}
