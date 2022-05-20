/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Embeddable, IContainer, ContainerInput } from '@kbn/embeddable-plugin/public';
import { TimeRangeInput } from './custom_time_range_action';

export function doesInheritTimeRange(embeddable: Embeddable<TimeRangeInput>) {
  if (!embeddable.parent) {
    return false;
  }

  const parent = embeddable.parent as IContainer<{}, ContainerInput<TimeRangeInput>>;

  // if it's a dashboard emptys screen, there will be no embeddable
  if (!parent.getInput().panels[embeddable.id]) {
    return false;
  }
  // If there is no explicit input defined on the parent then this embeddable inherits the
  // time range from whatever the time range of the parent is.
  return parent.getInput().panels[embeddable.id].explicitInput.timeRange === undefined;
}
