// All types must be universal and be castable on the client or on the server
import { intersection, keys, constant } from 'lodash';
import { getType } from './get_type';

// TODO: Currently all casting functions must be syncronous.

export function Type(config) {
  // Required
  this.name = config.name;

  // Optional
  this.help = config.help || ''; // A short help text

  // Optional type validation, useful for checking function output
  this.validate = config.validate || constant(true);

  const fns = {
    from: config.from || {},
    to: config.to || {},
  };

  const castableTypeNames = (types, toOrFrom) => intersection(types, keys(fns[toOrFrom]));

  this.castsTo = (types) => castableTypeNames(types, 'to').length > 0;
  this.castsFrom = (types) => castableTypeNames(types, 'from').length > 0;
  this.to = (node, types) => {
    const typeName = getType(node);
    if (typeName !== this.name) throw new Error(`Casting source type '${typeName}' does not match current type '${this.name}'`);
    if (!this.castsTo(types)) throw new Error(`Can not cast '${typeName}' to any of ${types.join(', ')}`);
    return fns.to[castableTypeNames(types, 'to')[0]](node);
  };

  this.from = (node) => {
    const typeName = getType(node);
    if (!this.castsFrom([typeName])) throw new Error(`Can not cast '${typeName}' to any of ${this.name}`);
    return fns.from[typeName](node);
  };
}
