export class BaseForm {
  constructor(name, props) {
    this.name = name;
    this.displayName = props.displayName || name;
    this.description = props.description || '';
  }
}
