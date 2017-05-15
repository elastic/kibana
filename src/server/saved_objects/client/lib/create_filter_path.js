export function createFilterPath(fields) {
  const baseKeys = ['hits.total', 'hits.hits._id', 'hits.hits._type'];

  if (Array.isArray(fields)) {
    return fields.map(f => `hits.hits._source.${f}`).concat(baseKeys);
  } else if (fields) {
    return baseKeys.concat([`hits.hits._source.${fields}`]);
  }
}
