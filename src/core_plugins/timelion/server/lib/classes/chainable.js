import TimelionFunction from './timelion_function';

export default class Chainable extends TimelionFunction {
  constructor(name, config) {
    super(name, config);
    this.chainable = true;
    Object.freeze(this);
  }
}
