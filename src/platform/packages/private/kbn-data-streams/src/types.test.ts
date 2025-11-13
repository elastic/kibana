/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IntegerMapping, KeywordMapping, TextMapping, BooleanMapping } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

import type {
  DataStreamDefinition,
  DataStreamDefinitionMappings,
  ObjectToPropertiesDefinition,
} from './types';

type SchemeDefinition = ObjectToPropertiesDefinition<{
  name: TextMapping;
  age: IntegerMapping;
  email: KeywordMapping;
  isActive: BooleanMapping;
}>;

const schemaDefinition: SchemeDefinition = {};

type SchemaDefinitionMapping = DataStreamDefinitionMappings<{
  name: TextMapping;
  age: IntegerMapping;
  email: KeywordMapping;
  isActive: BooleanMapping;
}>;

const dataStreamMappings: SchemaDefinitionMapping = {
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    email: mappings.keyword(),
    isActive: mappings.boolean(),
  },
};

const dataStreamDefinition: DataStreamDefinition = {
  name: 'test-data-stream',
  version: 1,
  template: {
    mappings: dataStreamMappings,
  },
};
