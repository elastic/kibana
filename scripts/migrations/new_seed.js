const { generateMigration } = require('./generate_migration');

const template = (id) => `module.exports = {
  id: '${id}',
  seed() {
    return {
      // TODO: fill this out with real values for an object
      // you want to create and insert into the index.
      // id: 'some-id-or-undefined',
      // type: 'example',
      // attributes: {
      //   should: 'match your mappings',
      // },
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
