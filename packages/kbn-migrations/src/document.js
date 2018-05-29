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
const Joi = require('joi');
const { MigrationPlan, MigrationContext, Document, Opts } = require('./lib');

module.exports = {
  transform,
};

const optsSchema = Joi.object().unknown().keys({
  callCluster: Opts.callClusterSchema.required(),
  index: Opts.indexSchema.required(),
  plugins: Opts.pluginArraySchema.required(),
  docs: Opts.documentArraySchema.required(),
  migrationState: Opts.migrationStateSchema.required(),
});

/**
 * Transforms documents to be the same version as the index. If such a
 * transform is impossible, this will throw an exception.
 * @param {ImportDocsOpts} opts
 * @prop {function} callCluster - The ElasticSearch connection
 * @prop {string} index - The index for which the documents are being transformed
 * @prop {Plugin[]} plugins - The plugins whose migrations will be used to transform the docs
 * @prop {Document[]} docs - The array of documents being transformed
 * @prop {MigrationState} migrationState - The migration state that was exported with the docs
 * @returns {Promise<Document[]>} - The transformed documents
 */
async function transform(opts) {
  Joi.assert(opts, optsSchema);
  const context = await MigrationContext.fetch(opts);
  const { migrationState: exportedState, docs } = opts;
  const { plugins, migrationState } = context;
  const transformDoc = buildImportFunction(plugins, exportedState, migrationState);
  return docs.map(transformDoc);
}

function buildImportFunction(plugins, exportedState, migrationState) {
  const { migrations } = MigrationPlan.build(plugins, exportedState);
  const validateDoc = buildValidationFunction(plugins, exportedState, migrationState);
  const transformDoc = Document.buildTransformFunction(migrations);

  return (doc) => transformDoc(validateDoc(doc));
}

// Unlike with index migrations, when we are importing documents, exportedState
// may contain plugins that the current system knows nothing about. Additionally,
// the exportedState may contain outdated versions of plugins which are now disabled
// and therefore the doc can't be migrated up to the state of the index.
// So, we have two failure cases:
// - If doc.type's exported version > our current version, fail
// - If doc.type's exported version < our current version, and there are not enough migrations available to upgrade it, throw
// We check on a per-doc basis, as the exported migration state may include migrations for docs
// that aren't actually being imported.
function buildValidationFunction(plugins, exportedState, migrationState) {
  const migrationsByType = _.chain(plugins)
    .filter('migrations')
    .map('migrations')
    .flatten()
    .groupBy('type')
    .value();
  const currentTypes = _.indexBy(migrationState.types, 'type');
  const exportedTypes = _.indexBy(exportedState.types, 'type');

  return (doc) => {
    const docVersion = _.get(exportedTypes, [doc.type, 'migrationIds', 'length'], 0);
    const newVersion = _.get(currentTypes, [doc.type, 'migrationIds', 'length'], 0);
    const availableMigrations = _.get(migrationsByType, [doc.type, 'length'], 0);
    const requiredVersion = Math.max(docVersion, newVersion);

    if (requiredVersion > newVersion) {
      throw new Error(
        `Document "${doc.id}" requires type "${doc.type}" version ${requiredVersion}, but our index is at version ${newVersion}`
      );
    }
    if (requiredVersion > availableMigrations) {
      throw new Error(
        `Document "${doc.id}" requires type "${doc.type}" version ${requiredVersion}, but the required plugins are disabled or missing.`
      );
    }

    return doc;
  };
}
