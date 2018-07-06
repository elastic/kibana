import { includes } from 'lodash';

export function Arg(config) {
  this.name = config.name;
  this.required = config.required || false;
  this.help = config.help;
  this.types = config.types || [];
  this.default = config.default;
  this.aliases = config.aliases || [];
  this.multi = config.multi == null ? false : config.multi;
  this.resolve = config.resolve == null ? true : config.resolve;
  this.accepts = type => {
    if (!this.types.length) return true;
    return includes(config.types, type);
  };
}
