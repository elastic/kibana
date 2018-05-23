function assertNonEmptyString(value, name) {
  if (!value || typeof value !== 'string') {
    throw new TypeError(`Expected "${value}" to be a ${name}`);
  }
}

/**
 *  Trim the prefix from the id of a saved object doc
 *
 *  @param  {string} id
 *  @param  {string} type
 *  @return {string}
 */
export function trimIdPrefix(id, type) {
  assertNonEmptyString(id, 'document id');
  assertNonEmptyString(type, 'saved object type');

  const prefix = `${type}:`;

  if (!id.startsWith(prefix)) {
    return id;
  }

  return id.slice(prefix.length);
}
