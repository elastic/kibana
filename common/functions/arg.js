import { includes } from 'lodash';

export function Arg(config) {
  this.name = config.name;
  this.types = config.types || [];
  this.default = config.default;
  this.aliases = config.aliases || [];
  this.isAlias = config.isAlias || false;
  this.multi = config.multi == null ? false : config.multi;
  this.accepts = (type) => {
    if (!this.types.length) return true;
    return includes(config.types, type);
  };
}
