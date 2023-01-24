/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TimeRange } from '@kbn/es-query';
import { EmbeddableOutput, Embeddable, EmbeddableInput, IContainer } from '../../..';

export interface EmbeddableTimeRangeInput extends EmbeddableInput {
  timeRange?: TimeRange;
}

export const TIME_RANGE_EMBEDDABLE = 'TIME_RANGE_EMBEDDABLE';

export class TimeRangeEmbeddable extends Embeddable<EmbeddableTimeRangeInput, EmbeddableOutput> {
  public readonly type = TIME_RANGE_EMBEDDABLE;

  constructor(initialInput: EmbeddableTimeRangeInput, parent?: IContainer) {
    const { title: defaultTitle, description: defaultDescription } = initialInput;
    super(
      initialInput,
      {
        defaultTitle,
        defaultDescription,
      },
      parent
    );
  }

  public render() {}

  public reload() {}
}
