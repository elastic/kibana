// Helper functions for transforming and seeding documents during a migration
const uuid = require('uuid');

export const DOC_TYPE = 'doc';
export const MIGRATION_DOC_TYPE = 'migration';
export const MIGRATION_DOC_ID = `${MIGRATION_DOC_TYPE}:migration-state`;

// Given a list of migration definitions, returns a list of properly transformed seeds
export function seededDocs(migrations) {
  return migrations.map((m, i) => ({ m, i }))
    .filter(({ m }) => !!m.seed)
    .map(({ m, i }) => {
      const transform = buildTransformFunction(migrations.slice(i));
      return transform(clientToRaw(m.seed()));
    });
}

// Creates a function which runs a document through the transforms
// defined in the list of migrations.
export function buildTransformFunction(migrations) {
  const transforms = migrations.filter(m => m.filter && m.transform);
  const transformDoc = (doc, { filter, transform }) => {
    return filter(doc) ? transform(doc) : doc;
  };
  return (rawDoc) => clientToRaw(transforms.reduce(transformDoc, rawToClient(rawDoc)));
}

export function rawToClient(doc) {
  const { _id, _source } = doc;
  const { type } = _source;
  const id = _id.slice(type.length + 1);
  return {
    id,
    type,
    updated_at: _source.updated_at,
    attributes: _source[type],
  };
}

// eslint-disable-next-line camelcase
export function clientToRaw({ id, type, updated_at, attributes }) {
  return {
    _id: `${type}:${id === undefined ? uuid() : id}`,
    _source: {
      type,
      updated_at,
      [type]: attributes,
    },
  };
}
