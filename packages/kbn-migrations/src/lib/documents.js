// Helper functions for transforming and seeding documents during a migration
const uuid = require('uuid');

const DOC_TYPE = 'doc';

module.exports = {
  DOC_TYPE,
  seededDocs,
  buildTransformFunction,
  toRaw,
  toObjectClient,
};

// Given a list of migration definitions, returns a list of properly transformed seeds
function seededDocs(migrations) {
  return migrations.map((m, i) => ({ m, i }))
    .filter(({ m }) => !!m.seed)
    .map(({ m, i }) => {
      const transform = buildTransformFunction(migrations.slice(i));
      return transform(m.seed());
    });
}

// Creates a function which runs a document through the transforms
// defined in the list of migrations.
function buildTransformFunction(migrations) {
  const transforms = migrations.filter(m => m.filter && m.transform);
  const transformDoc = (doc, { filter, transform }) => {
    return filter(doc) ? transform(doc) : doc;
  };
  return (doc) => {
    const objectClientDoc = toObjectClient(doc);
    return objectClientDoc ? transforms.reduce(transformDoc, objectClientDoc) : doc;
  };
}

function toRaw(doc) {
  if (isObjectClient(doc)) {
    return clientToRaw(doc);
  }
  return doc;
}

function toObjectClient(doc) {
  if (isObjectClient(doc)) {
    return doc;
  }
  if (isRaw(doc)) {
    return rawToClient(doc);
  }
  return undefined;
}

function isObjectClient(doc) {
  return doc.hasOwnProperty('type') && doc.hasOwnProperty('attributes');
}

function isRaw({ _source }) {
  return _source && _source.type && _source.hasOwnProperty(_source.type);
}

function rawToClient({ _id, _source }) {
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
