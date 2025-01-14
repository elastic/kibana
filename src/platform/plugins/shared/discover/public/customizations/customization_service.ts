/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter, map, Observable, startWith, Subject } from 'rxjs';
import {
  DataTableCustomization,
  FlyoutCustomization,
  SearchBarCustomization,
  TopNavCustomization,
  UnifiedHistogramCustomization,
  FieldListCustomization,
} from './customization_types';

export type DiscoverCustomization =
  | FlyoutCustomization
  | SearchBarCustomization
  | TopNavCustomization
  | UnifiedHistogramCustomization
  | DataTableCustomization
  | FieldListCustomization;

export type DiscoverCustomizationId = DiscoverCustomization['id'];

export interface DiscoverCustomizationService {
  set: (customization: DiscoverCustomization) => void;
  get: <TCustomizationId extends DiscoverCustomizationId>(
    id: TCustomizationId
  ) => Extract<DiscoverCustomization, { id: TCustomizationId }> | undefined;
  get$: <TCustomizationId extends DiscoverCustomizationId>(
    id: TCustomizationId
  ) => Observable<Extract<DiscoverCustomization, { id: TCustomizationId }> | undefined>;
  enable: (id: DiscoverCustomizationId) => void;
  disable: (id: DiscoverCustomizationId) => void;
}

interface CustomizationEntry {
  customization: DiscoverCustomization;
  enabled: boolean;
}

export const createCustomizationService = (): DiscoverCustomizationService => {
  const update$ = new Subject<DiscoverCustomizationId>();
  const customizations = new Map<DiscoverCustomizationId, CustomizationEntry>();

  const getCustomization = <TCustomizationId extends DiscoverCustomizationId>(
    id: TCustomizationId
  ): Extract<DiscoverCustomization, { id: TCustomizationId }> | undefined => {
    const entry = customizations.get(id);
    if (entry && entry.enabled) {
      return entry.customization as Extract<DiscoverCustomization, { id: TCustomizationId }>;
    }
  };

  return {
    set: (customization: DiscoverCustomization) => {
      const entry = customizations.get(customization.id);
      customizations.set(customization.id, {
        customization,
        enabled: entry?.enabled ?? true,
      });
      update$.next(customization.id);
    },

    get: getCustomization,

    get$: <TCustomizationId extends DiscoverCustomizationId>(id: TCustomizationId) => {
      return update$.pipe(
        startWith(id),
        filter((currentId) => currentId === id),
        map(() => getCustomization(id))
      );
    },

    enable: (id: DiscoverCustomizationId) => {
      const entry = customizations.get(id);
      if (entry && !entry.enabled) {
        entry.enabled = true;
        update$.next(entry.customization.id);
      }
    },

    disable: (id: DiscoverCustomizationId) => {
      const entry = customizations.get(id);
      if (entry && entry.enabled) {
        entry.enabled = false;
        update$.next(entry.customization.id);
      }
    },
  };
};
