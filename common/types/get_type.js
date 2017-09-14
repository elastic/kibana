export function getType(node) {
  if (node == null) return 'null';
  if (typeof node === 'object') {
    if (!node.type) throw new Error('Objects must have a type propery');
    return node.type;
  }

  return typeof node;
}
