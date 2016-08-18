const keys = Symbol('keys');
const values = Symbol('values');
const remainingSize = Symbol('remainingSize');

export default class StubBrowserStorage {
  constructor() {
    this[keys] = [];
    this[values] = [];
    this[remainingSize] = 5000000; // 5mb, minimum browser storage size
  }

  get length() {
    return this[keys].length;
  }

  key(i) {
    return this[keys][i];
  }

  getItem(key) {
    key = String(key);

    const i = this[keys].indexOf(key);
    if (i === -1) return null;
    return this[values][i];
  }

  setItem(key, value) {
    key = String(key);
    value = String(value);
    this._takeUpSpace(this._calcSizeOfAdd(key, value));

    const i = this[keys].indexOf(key);
    if (i === -1) {
      this[keys].push(key);
      this[values].push(value);
    } else {
      this[values][i] = value;
    }
  }

  removeItem(key) {
    key = String(key);
    this._takeUpSpace(this._calcSizeOfRemove(key));

    const i = this[keys].indexOf(key);
    if (i === -1) return;
    this[keys].splice(i, 1);
    this[values].splice(i, 1);
  }

  // non-standard api methods
  _getKeys() {
    return this[keys].slice();
  }

  _getValues() {
    return this[values].slice();
  }

  _setSizeLimit(limit) {
    if (this[keys].length) {
      throw new Error('You must call _setSizeLimit() before setting any values');
    }

    this[remainingSize] = limit;
  }

  _calcSizeOfAdd(key, value) {
    const i = this[keys].indexOf(key);
    if (i === -1) {
      return key.length + value.length;
    }
    return value.length - this[values][i].length;
  }

  _calcSizeOfRemove(key) {
    const i = this[keys].indexOf(key);
    if (i === -1) {
      return 0;
    }
    return 0 - (key.length + this[values][i].length);
  }

  _takeUpSpace(delta) {
    if (this[remainingSize] - delta < 0) {
      throw new Error('something about quota exceeded, browsers are not consistent here');
    }

    this[remainingSize] -= delta;
  }
}
