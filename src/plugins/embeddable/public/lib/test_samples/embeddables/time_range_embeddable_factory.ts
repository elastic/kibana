/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IContainer, EmbeddableFactoryDefinition } from '../../..';
import {
  TIME_RANGE_EMBEDDABLE,
  TimeRangeEmbeddable,
  EmbeddableTimeRangeInput,
} from './time_range_embeddable';

export class TimeRangeEmbeddableFactory
  implements EmbeddableFactoryDefinition<EmbeddableTimeRangeInput>
{
  public readonly type = TIME_RANGE_EMBEDDABLE;

  public async isEditable() {
    return true;
  }

  public async create(initialInput: EmbeddableTimeRangeInput, parent?: IContainer) {
    return new TimeRangeEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return 'time range';
  }
}
