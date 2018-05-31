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
