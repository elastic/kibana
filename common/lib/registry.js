import { clone } from 'lodash';

export function Registry(prop = 'name') {
  let _indexed = new Object();

  this.register = (obj) => {
    if (typeof obj !== 'object' || !obj[prop]) {
      throw new Error(`Register requires an object with a ${prop} property`);
    }

    _indexed[obj[prop]] = obj;
  };

  this.toJS = () => {
    return Object.keys(_indexed).reduce((acc, key) => {
      acc[key] = this.get(key);
      return acc;
    }, {});
  };

  this.get = (name) => {
    return _indexed[name] ? clone(_indexed[name]) : null;
  };

  this.reset = () => {
    _indexed = new Object();
  };
}
