const { generateMigration } = require('./generate_migration');

const template = (id) => `module.exports = {
  id: '${id}',

  // TODO: implement filter to return true if this migration
  // applies to the specified document. The document takes a
  // shape like this:
  // { id: 'something', type: 'example', attributes: { field: 'here' } }
  filter: (doc) => false,

  // TODO: implement the transform function to transform an old
  // document to the new format.
  transform(doc) {
    return {
      ...doc,
    };
  },
};
`;

module.exports = {
  newTransform(pluginDir, fileName) {
    generateMigration({
      pluginDir,
      fileName,
      template,
      type: 'transform',
    });
  },
};
