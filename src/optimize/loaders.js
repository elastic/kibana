import { parse as parseUrl, format as formatUrl } from 'url';

class Loader {
  constructor({ name, query } = {}) {
    if (!name) {
      throw new Error('Loaders must define a name');
    }

    this.name = name;
    this.query = query || {};
  }

  static fromUrl(url) {
    const parsed = parseUrl(url, true);
    return new Loader({
      name: parsed.pathname,
      query: parsed.query
    });
  }

  toString() {
    return formatUrl({
      pathname: this.name,
      query: this.query
    });
  }

  setQueryParam(name, value) {
    this.query[name] = value;
    return this;
  }
}

function parseLoader(spec) {
  if (typeof spec === 'string') {
    return Loader.fromUrl(spec);
  }

  return new Loader(spec);
}

export const makeLoaderString = (loaders) => {
  return loaders.map(parseLoader).map(l => l.toString()).join('!');
};

export const setLoaderQueryParam = (loader, name, value) => {
  return parseLoader(loader).setQueryParam(name, value).toString();
};
