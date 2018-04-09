import _ from 'lodash';
import { migrationMapping } from './migration_state';
import { disabledPluginIds } from './plugins';

// Given the current set of enabled plugins, and the previous
// or default migration state, this returns the mappings and
// migrations which need to be applied.
export function buildMigrationPlan(plugins, migrationState) {
  return {
    mappings: buildMappings(plugins, migrationState),
    migrations: unappliedMigrations(plugins, migrationState),
  };
}

function unappliedMigrations(plugins, migrationState) {
  const hash = _.indexBy(migrationState.plugins, 'id');
  const result = plugins.reduce((acc, { id, migrations }) => {
    const appliedMigrationIds = _.get(hash, [id, 'migrationIds'], []);
    const newMigrations = migrations.slice(appliedMigrationIds.length)
      .map(m => ({ ...m, pluginId: id }));
    acc.push(newMigrations);
    return acc;
  }, []);
  return _.compact(_.flatten(result));
}

// Given a list of plugins and the current migration state of the index,
// builds the mappings to be applied to the next version of the index.
// Mappings associated w/ disabled plugins are moved as-is.
function buildMappings(plugins, migrationState) {
  const allMappings = [].concat(
    disabledPluginMappings(plugins, migrationState),
    _.map(plugins, 'mappings'),
    migrationMapping,
  );
  return {
    doc: {
      dynamic: 'strict',
      properties: mergeMappings(allMappings),
    },
  };
}

function disabledPluginMappings(plugins, migrationState) {
  const mappingsById = _.indexBy(migrationState.plugins, 'id');
  return disabledPluginIds(plugins, migrationState)
    .map(id => JSON.parse(mappingsById[id].mappings));
}

// Shallow merge of the specified objects into one object, if any property
// conflicts occur, this will bail with an error.
function mergeMappings(mappings) {
  return _.compact(mappings).reduce((acc, mapping) => {
    const duplicateKey = Object.keys(mapping).find(k => acc.hasOwnProperty(k));
    if (duplicateKey) {
      throw new Error(`Mapping "${duplicateKey}" is defined more than once!`);
    }
    return Object.assign(acc, mapping);
  }, {});
}
