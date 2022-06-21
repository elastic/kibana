/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableInput,
  IContainer,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { TIME_RANGE_EMBEDDABLE, TimeRangeEmbeddable } from './time_range_embeddable';

interface EmbeddableTimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

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
