const { generateMigration } = require('./generate_migration');

const template = (id) => `module.exports = {
  id: '${id}',

  // TODO: specify the type of document that this migration will transform
  type: 'YOUR_TYPE',

  // TODO: implement the transform function to transform an old document to the new format.
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
