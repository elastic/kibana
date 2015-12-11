module.exports = function createRelationshipObject(type, id) {
  return {
    data: {
      type: type,
      id: id
    }
  };
};
