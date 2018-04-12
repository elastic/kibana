// Helper functions for transforming and seeding documents during a migration

export const DOC_TYPE = 'doc';
export const MIGRATION_DOC_ID = 'migration:migration-state';

// Given a list of migration definitions, returns a list of properly transformed seeds
export function seededDocs(migrations) {
  return migrations.map((m, i) => ({ m, i }))
    .filter(({ m }) => !!m.seed)
    .map(({ m, i }) => {
      const transform = buildTransformFunction(migrations.slice(i));
      return transform(m.seed());
    });
}

// Creates a function which runs a document through the transforms
// defined in the list of migrations.
export function buildTransformFunction(migrations) {
  const transforms = migrations.filter(m => m.filter && m.transform);
  const transformDoc = (doc, { filter, transform }) => {
    const result = filter(doc._source, doc) ? transform(doc._source, doc) : doc;
    return convertToRaw(result, doc._id);
  };
  return (doc) => transforms.reduce(transformDoc, convertToRaw(doc));
}

function convertToRaw(_source, _id) {
  return isRawDoc(_source) ? _source : {
    _id,
    _source,
  };
}

function isRawDoc({ _id, _source }) {
  return _id !== undefined && _source !== undefined;
}
