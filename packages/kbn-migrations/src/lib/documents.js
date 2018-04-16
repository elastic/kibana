// Helper functions for transforming and seeding documents during a migration
const uuid = require('uuid');

const DOC_TYPE = 'doc';

module.exports = {
  DOC_TYPE,
  seededDocs,
  buildTransformFunction,
  rawToClient,
  clientToRaw,
};

// Given a list of migration definitions, returns a list of properly transformed seeds
function seededDocs(migrations) {
  return migrations.map((m, i) => ({ m, i }))
    .filter(({ m }) => !!m.seed)
    .map(({ m, i }) => {
      const transform = buildTransformFunction(migrations.slice(i));
      return transform(clientToRaw(m.seed()));
    });
}

// Creates a function which runs a document through the transforms
// defined in the list of migrations.
function buildTransformFunction(migrations) {
  const transforms = migrations.filter(m => m.filter && m.transform);
  const transformDoc = (doc, { filter, transform }) => {
    return filter(doc) ? transform(doc) : doc;
  };
  return (rawDoc) => {
    if (canConvertToClient(rawDoc)) {
      return clientToRaw(transforms.reduce(transformDoc, rawToClient(rawDoc)));
    }
    return rawDoc;
  };
}

function rawToClient(doc) {
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
function clientToRaw({ id, type, updated_at, attributes }) {
  return {
    _id: `${type}:${id === undefined ? uuid() : id}`,
    _source: {
      type,
      updated_at,
      [type]: attributes,
    },
  };
}

function canConvertToClient(rawDoc) {
  const { _id, _source } = rawDoc;
  if (!_id || !_source || !_source.type) {
    return false;
  }
  const { type } = _source;
  return _id.startsWith(type) && !!_source[type];
}
