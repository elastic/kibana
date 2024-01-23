/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: needs to be imported for decorators used by inversify.
//       needs to be loaded exactly one.
//       so need to figure out exactly where the best place to load it would be.
import 'reflect-metadata';

export {
  pluginOpaqueIdServiceId,
  pluginNameServiceId,
  pluginManifestServiceId,
} from './src/service_identifiers';
