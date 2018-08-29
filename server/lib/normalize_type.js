export function normalizeType(type) {
  const normalTypes = {
    string: ['string', 'text', 'keyword', '_type', '_id', '_index'],
    number: [
      'float',
      'half_float',
      'scaled_float',
      'double',
      'integer',
      'long',
      'short',
      'byte',
      'token_count',
      '_version',
    ],
    date: ['date'],
    boolean: ['boolean'],
    null: ['null'],
  };

  const normalizedType = Object.keys(normalTypes).find(t => normalTypes[t].includes(type));

  if (normalizedType) return normalizedType;
  throw new Error(`Canvas does not yet support type: ${type}`);
}
