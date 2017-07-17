export function getRootType(mappings) {
  const rootTypes = Object.keys(mappings);

  if (rootTypes.length !== 1) {
    throw new TypeError(`Unable to get root type of mappings object with ${rootTypes.length} root types.`);
  }

  return rootTypes[0];
}
