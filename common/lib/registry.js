import { find } from 'lodash';

export function Registry(len) {
  const registry = new Array(len || 0);
  Object.setPrototypeOf(registry, Registry.prototype);

  registry.byName = function byName(name) {
    // TODO: This could be more efficient if we indexed the registry every time the array changed.
    return find(this, { name });
  };

  return registry;
}
Registry.prototype = Object.create(Array.prototype);
