import { findKey } from 'lodash';

export function normalizeType(type) {
  const normalTypes = {
    string: ['string', 'text', 'keyword', '_type', '_id'],
    number: ['float', 'half_float', 'scaled_float', 'double', 'integer', 'long', 'short', 'byte', 'token_count'],
    date: ['date'],
  };

  const normalizedType = findKey(normalTypes, types => types.includes(type));

  if (normalizedType) return normalizedType;
  throw new Error(`Canvas does not yet support type: ${type}`);
}
