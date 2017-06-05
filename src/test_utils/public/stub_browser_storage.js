export default class StubBrowserStorage {
  constructor() {
    this._keys = [];
    this._values = [];
    this._size = 0;
    this._sizeLimit = 5000000; // 5mb, minimum browser storage size
  }

  // -----------------------------------------------------------------------------------------------
  // Browser-specific methods.
  // -----------------------------------------------------------------------------------------------

  get length() {
    return this._keys.length;
  }

  key(i) {
    return this._keys[i];
  }

  getItem(key) {
    key = String(key);

    const i = this._keys.indexOf(key);
    if (i === -1) return null;
    return this._values[i];
  }

  setItem(key, value) {
    key = String(key);
    value = String(value);
    const sizeOfAddition = this._getSizeOfAddition(key, value);
    this._updateSize(sizeOfAddition);

    const i = this._keys.indexOf(key);
    if (i === -1) {
      this._keys.push(key);
      this._values.push(value);
    } else {
      this._values[i] = value;
    }
  }

  removeItem(key) {
    key = String(key);
    const sizeOfRemoval = this._getSizeOfRemoval(key);
    this._updateSize(sizeOfRemoval);

    const i = this._keys.indexOf(key);
    if (i === -1) return;
    this._keys.splice(i, 1);
    this._values.splice(i, 1);
  }

  // -----------------------------------------------------------------------------------------------
  // Test-specific methods.
  // -----------------------------------------------------------------------------------------------

  getStubbedKeys() {
    return this._keys.slice();
  }

  getStubbedValues() {
    return this._values.slice();
  }

  setStubbedSizeLimit(sizeLimit) {
    // We can't reconcile a size limit with the "stored" items, if the stored items size exceeds it.
    if (sizeLimit < this._size) {
      throw new Error(`You can't set a size limit smaller than the current size.`);
    }

    this._sizeLimit = sizeLimit;
  }

  getStubbedSizeLimit() {
    return this._sizeLimit;
  }

  getStubbedSize() {
    return this._size;
  }

  _getSizeOfAddition(key, value) {
    const i = this._keys.indexOf(key);
    if (i === -1) {
      return key.length + value.length;
    }
    // Return difference of what's been stored, and what *will* be stored.
    return value.length - this._values[i].length;
  }

  _getSizeOfRemoval(key) {
    const i = this._keys.indexOf(key);
    if (i === -1) {
      return 0;
    }
    // Return negative value.
    return -(key.length + this._values[i].length);
  }

  _updateSize(delta) {
    if (this._size + delta > this._sizeLimit) {
      throw new Error('something about quota exceeded, browsers are not consistent here');
    }

    this._size += delta;
  }
}
