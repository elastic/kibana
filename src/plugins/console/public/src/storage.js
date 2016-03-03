const { transform, keys, startsWith } = require('lodash');

class Storage {
  constructor(engine, prefix) {
    this.engine = engine;
    this.prefix = prefix;
  }

  encode(val) {
    return JSON.stringify(val);
  }

  decode(val) {
    if (typeof val === 'string') {
      return JSON.parse(val);
    }
  }

  encodeKey(key) {
    return `${this.prefix}${key}`;
  }

  decodeKey(key) {
    if (startsWith(key, this.prefix)) {
      return `${key.slice(this.prefix.length)}`;
    }
  }

  set(key, val) {
    this.engine.setItem(this.encodeKey(key), this.encode(val));
    return val;
  }

  has(key) {
    return this.engine.getItem(this.encodeKey(key)) != null;
  }

  get(key, _default) {
    if (this.has(key)) {
      return this.decode(this.engine.getItem(this.encodeKey(key)));
    } else {
      return _default;
    }
  }

  delete(key) {
    return this.engine.removeItem(this.encodeKey(key));
  }

  keys() {
    return transform(keys(this.engine), (ours, key) => {
      const ourKey = this.decodeKey(key);
      if (ourKey != null) ours.push(ourKey);
    });
  }
}

module.exports = new Storage(localStorage, 'sense:');
