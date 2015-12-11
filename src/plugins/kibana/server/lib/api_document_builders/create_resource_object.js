module.exports = function createResourceObject(type, id, attributes, relationships) {
  const resource = {
    type: type,
    id: id,
    attributes: attributes
  };
  if (relationships) {
    resource.relationships = relationships;
  }

  return resource;
};
