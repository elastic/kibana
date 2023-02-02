/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TimeRange } from '@kbn/es-query';
import { Embeddable, IContainer, ContainerInput } from '../../../../..';
import { TimeRangeInput } from './customize_panel_action';

interface ContainerTimeRangeInput extends ContainerInput<TimeRangeInput> {
  timeRange: TimeRange;
}

export function canInheritTimeRange(embeddable: Embeddable<TimeRangeInput>) {
  if (!embeddable.parent) {
    return false;
  }

  const parent = embeddable.parent as IContainer<TimeRangeInput, ContainerTimeRangeInput>;

  return parent.getInput().timeRange !== undefined;
}
