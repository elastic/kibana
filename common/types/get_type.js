export function getType(node) {
  if (node == null) return 'null';
  if (typeof node === 'object') {
    if (!node.type) throw new Error('Objects must have a type propery');
    return node.type;
  }

  return typeof node;
}

export function getStringType(str) {
  if (typeof str !== 'string') return getType(str);
  if (str == null) return 'null';
  if (str === 'true' || str === 'false') return 'boolean';
  if (!isNaN(Number(str))) return 'number';
  return 'string';
}
