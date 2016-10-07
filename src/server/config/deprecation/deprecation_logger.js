import _ from 'lodash';

export class DeprecationLogger {
  constructor() {
    this._logger = (message) => {
      throw new Error(message);
    };
  }

  set(fn) {
    if (!_.isFunction(fn)) {
      throw new Error('fn must be a function');
    }

    this._logger = fn;
  }

  log(message) {
    this._logger(message);
  }
}
