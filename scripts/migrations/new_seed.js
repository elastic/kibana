const { generateMigration } = require('./generate_migration');
const uuid = require('uuid');

const template = (id) => `module.exports = {
  // The id of this migration, must be unique for
  id: '${id}',

  // The type of document the seed function produces
  type: 'YOUR_TYPE',

  // A function / method that produces a document to be seeded into the
  // destination index when migrations run
  seed() {
    // TODO: replace YOUR_TYPE above and below with the appropriate type
    // specify your attributes, optionally specify a different id, and
    // make sure to import this file into your array of migrations.
    return {
      id: '${uuid.v1()}',
      type: 'YOUR_TYPE',
      attributes: {
      }
    };
  }
};
`;

module.exports = {
  newSeed(pluginDir, fileName) {
    generateMigration({
      pluginDir,
      fileName,
      template,
      type: 'seed',
    });
  },
};
