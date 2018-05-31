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
const Joi = require('joi');

const migrationSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().required(),
  seed: Joi.func(),
  transform: Joi.func(),
}).xor('seed', 'transform');

const pluginSchema = Joi.object({
  id: Joi.string().required(),
  mappings: Joi.object(),
  migrations: Joi.array().items(migrationSchema),
}).unknown();

const documentSchema = Joi.object().unknown().keys({
  id: Joi.string(),
  type: Joi.string().required(),
  attributes: Joi.any().required(),
});

const callClusterSchema = Joi.func();
const indexSchema = Joi.string();
const pluginArraySchema = Joi.array().items(pluginSchema);
const documentArraySchema = Joi.array().items(documentSchema);
const migrationStateSchema = Joi.object({
  status: Joi.string(),
  plugins: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    mappings: Joi.string(),
    checksum: Joi.string().required(),
    migrationIds: Joi.array().required().items(Joi.string()),
  })),
}).unknown();

module.exports = {
  migrationSchema,
  pluginSchema,
  callClusterSchema,
  indexSchema,
  pluginArraySchema,
  documentArraySchema,
  migrationStateSchema,
};
