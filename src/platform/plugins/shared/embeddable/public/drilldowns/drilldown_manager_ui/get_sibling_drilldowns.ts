/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HasUniqueId, PublishesTitle } from '@kbn/presentation-publishing';
import {
  apiHasParentApi,
  apiHasUniqueId,
  apiIsPresentationContainer,
  getTitle,
} from '@kbn/presentation-publishing';
import { v4 } from 'uuid';
import type { DrilldownTemplate } from './types';
import type { HasDrilldowns } from '../types';

export const getSiblingDrilldowns = (
  embeddable: unknown,
  compatibleFactoryTypes: string[]
): DrilldownTemplate[] => {
  if (!apiHasParentApi(embeddable)) {
    return [];
  }
  const parentApi = embeddable.parentApi;
  if (!apiIsPresentationContainer(parentApi)) return [];

  const templates: DrilldownTemplate[] = [];
  for (const childId of Object.keys(parentApi.children$.value)) {
    const child = parentApi.children$.value[childId] as Partial<
      HasUniqueId & PublishesTitle & HasDrilldowns
    >;
    const embeddableId = apiHasUniqueId(embeddable) ? embeddable.uuid : undefined;
    if (childId === embeddableId) continue;
    if (!child.drilldowns$) continue;

    for (const drilldownState of child.drilldowns$.getValue()) {
      if (compatibleFactoryTypes.includes(drilldownState.type)) {
        templates.push({
          id: v4(),
          description: getTitle(child) ?? child.uuid ?? '',
          drilldownState,
        });
      }
    }
  }

  return templates;
};
