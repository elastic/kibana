/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule, interfaces } from 'inversify';
import { typeSpecs } from './specs';
import { AnyExpressionTypeDefinition } from './types';

export const TypeToken: interfaces.ServiceIdentifier<AnyExpressionTypeDefinition> =
  Symbol.for('Type');

export function TypesModule() {
  return new ContainerModule((bind) => {
    typeSpecs.forEach((spec) => bind(TypeToken).toConstantValue(spec));
  });
}
