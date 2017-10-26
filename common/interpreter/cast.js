import _ from 'lodash';
import { getType } from '../lib/get_type';

export function castProvider(types) {
  return function cast(node, toTypeNames) {
    // If you don't give us anything to cast to, you'll get your input back
    if (!toTypeNames || toTypeNames.length === 0) return node;

    // No need to cast if node is already one of the valid types
    const fromTypeName = getType(node);
    if (_.includes(toTypeNames, fromTypeName)) return node;

    const fromTypeDef = types[fromTypeName];

    // First check if this object can make itself into any of the targets
    if (fromTypeDef && fromTypeDef.castsTo(toTypeNames)) return fromTypeDef.to(node, toTypeNames);

    // If that isn't possible, filter the valid types to ones that can create themselves from fromTypeName
    const validToTypeNames = _.filter(toTypeNames, toTypeName => {
      const toTypeDef = types[toTypeName];
      if (!toTypeDef) return false;
      return toTypeDef.castsFrom([fromTypeName]);
    });

    // And return the first one
    if (validToTypeNames.length > 0) return types[validToTypeNames[0]].from(node);

    throw new Error(`Can not cast '${fromTypeName}' to any of '${toTypeNames.join(', ')}'`);
  };
}
