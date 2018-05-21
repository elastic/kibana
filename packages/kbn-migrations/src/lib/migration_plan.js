const _ = require('lodash');
const MigrationState = require('./migration_state');

module.exports = {
  build,
  buildMappings,
};

// Computes the mappings and migrations which need to be applied.
// It's important to move existing mappings over so their docs remain valid.
function build(plugins, storedMigrationState, currentMappings) {
  return {
    mappings: updateMappings(currentMappings, buildMappings([...plugins])),
    migrations: unappliedMigrations(plugins, storedMigrationState),
  };
}

function unappliedMigrations(plugins, storedMigrationState) {
  const previousTypes = _.indexBy(storedMigrationState.types, 'type');
  const numApplied = type => _.get(previousTypes, [type, 'migrationIds', 'length'], 0);
  return _.chain(plugins)
    .filter('migrations')
    .reduce((acc, { migrations }) => Object.assign(acc, _.groupBy(migrations, 'type')), {})
    .map((migrations, type) => migrations.slice(numApplied(type)))
    .flatten()
    .compact()
    .value();
}

function buildMappings(plugins) {
  const migrationMappings = {
    id: 'migrations',
    mappings: MigrationState.mappings
  };
  return {
    doc: {
      dynamic: 'strict',
      properties: mergeMappings([
        migrationMappings,
        ...plugins,
      ]),
    },
  };
}

function updateMappings(currentMappings, newMappings) {
  const currentProperties = _.get(currentMappings, [_(currentMappings).keys().first(), 'mappings', 'doc', 'properties'], {});
  return {
    doc: {
      ...newMappings.doc,
      properties: {
        ...currentProperties,
        ...newMappings.doc.properties,
      },
    },
  };
}

// Shallow merge of the specified objects into one object, if any property
// conflicts occur, this will bail with an error.
function mergeMappings(mappings) {
  return mappings
    .filter(({ mappings }) => !!mappings)
    .reduce((acc, { id, mappings }) => {
      const invalidKey = Object.keys(mappings).find(k => k.startsWith('_') || acc.hasOwnProperty(k));
      if (_.startsWith(invalidKey, '_')) {
        throw new Error(`Invalid mapping "${invalidKey}" in plugin "${id}". Mappings cannot start with _.`);
      }
      if (invalidKey) {
        throw new Error(`Plugin "${id}" is attempting to redefine mapping "${invalidKey}".`);
      }
      return Object.assign(acc, mappings);
    }, {});
}
