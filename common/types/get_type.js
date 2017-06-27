import { isValid as isValidDataurl } from '../lib/dataurl';

export function getType(node) {
  if (node == null) return 'null';
  if (typeof node === 'object') {
    if (!node.type) throw new Error('Objects must have a type propery');
    return node.type;
  }

  const type = typeof node;

  // check for dataurl encoding
  if (type === 'string') {
    if (isValidDataurl(node)) return 'dataurl';
  }

  return typeof node;
}
