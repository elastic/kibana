/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../entity';
import { Serializable } from '../serializable';

export interface EntityDocument extends Fields {
  'entity.id': string;
  'entity.latestTimestamp': string;
  'entity.indexPatterns': string[];
  'entity.definitionId': string;
}

export class Entity<F extends EntityDocument> extends Serializable<F> {}
