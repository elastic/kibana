import clone from 'lodash.clone';

export class Registry {
  constructor(prop = 'name') {
    this._prop = prop;
    this._indexed = new Object();
  }

  wrapper(obj) {
    return obj;
  }

  register(fn) {
    if (typeof fn !== 'function') {
      throw new Error(`Register requires an function`);
    }
    const obj = fn();

    if (typeof obj !== 'object' || !obj[this._prop]) {
      throw new Error(`Registered functions must return an object with a ${this._prop} property`);
    }
    this._indexed[obj[this._prop]] = this.wrapper(obj);
  }

  toJS() {
    return Object.keys(this._indexed).reduce((acc, key) => {
      acc[key] = this.get(key);
      return acc;
    }, {});
  }

  toArray() {
    return Object.keys(this._indexed).map(key => this.get(key));
  }

  get(name) {
    return this._indexed[name] ? clone(this._indexed[name]) : null;
  }

  getProp() {
    return this._prop;
  }

  reset() {
    this._indexed = new Object();
  }
}
