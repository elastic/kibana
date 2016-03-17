const store = Symbol('store');

export default class TabFakeStore {
  constructor() { this[store] = new Map(); }
  getItem(k) { return this[store].get(k); }
  setItem(k, v) { return this[store].set(k, v); }
  removeItem(k) { return this[store].delete(k); }
  getKeys() { return [ ...this[store].keys() ]; }
  getValues() { return [ ...this[store].values() ]; }
}
