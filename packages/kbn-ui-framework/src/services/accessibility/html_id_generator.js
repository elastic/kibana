import uuid from 'uuid';

/**
 * This function returns a function to generate ids.
 * This can be used to generate unique, but predictable ids to pair labels
 * with their inputs. It takes an optional prefix as a parameter. If you don't
 * specify it, it generates a random id prefix.
 */
export function htmlIdGenerator(idPrefix) {
  const prefix = idPrefix || uuid.v1();
  return (suffix) => `${prefix}_${suffix || uuid.v1()}`;
}
