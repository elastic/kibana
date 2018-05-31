/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
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
    .map('migrations')
    .flatten()
    .groupBy('type')
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
  const currentIndex = _(currentMappings).keys().first();
  const currentProperties = _.get(currentMappings, [currentIndex, 'mappings', 'doc', 'properties'], {});
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
function mergeMappings(plugins) {
  return _(plugins)
    .filter('mappings')
    .reduce(validateAndMergePlugin, {});
}

function validateAndMergePlugin(acc, { id, mappings }) {
  Object.keys(mappings).forEach(mappingName => {
    assertUnique(id, acc, mappingName);
    assertValidMappingNames(id, mappingName);
  });
  return Object.assign(acc, mappings);
}

function assertUnique(pluginId, mappings, mappingName) {
  if (mappings.hasOwnProperty(mappingName)) {
    throw new Error(`Plugin "${pluginId}" is attempting to redefine mapping "${mappingName}".`);
  }
}

function assertValidMappingNames(pluginId, mappingName) {
  if (mappingName.startsWith('_')) {
    throw new Error(`Invalid mapping "${mappingName}" in plugin "${pluginId}". Mappings cannot start with _.`);
  }
}
