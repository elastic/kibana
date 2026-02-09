/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PresentationContainer } from '@kbn/presentation-containers';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import type { HasParentApi, HasUniqueId, PublishesTitle } from '@kbn/presentation-publishing';
import { getTitle } from '@kbn/presentation-publishing';
import { v4 } from 'uuid';
import type { DrilldownTemplate } from './types';
import type { HasDrilldowns } from '../types';

export const getSiblingDrilldowns = (
  embeddable: Partial<HasUniqueId> & HasParentApi<Partial<PresentationContainer>>
): DrilldownTemplate[] => {
  const parentApi = embeddable.parentApi;
  if (!apiIsPresentationContainer(parentApi)) return [];

  const templates: DrilldownTemplate[] = [];
  for (const childId of Object.keys(parentApi.children$.value)) {
    const child = parentApi.children$.value[childId] as Partial<
      HasUniqueId & PublishesTitle & HasDrilldowns
    >;
    if (childId === embeddable.uuid) continue;
    if (!child.drilldowns$) continue;

    for (const drilldownState of child.drilldowns$.getValue()) {
      templates.push({
        id: v4(),
        description: getTitle(child) ?? child.uuid ?? '',
        drilldownState,
      });
    }
  }

  return templates;
};
