export default class ArgType {
  constructor(name, props) {
    this.name = name;
    this.resolve = props.resolve;
  }
}
