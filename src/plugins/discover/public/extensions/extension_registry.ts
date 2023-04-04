/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filter, map, Observable, startWith, Subject } from 'rxjs';

export interface DiscoverExtension {
  id: string;
}

export type DiscoverExtensionId = DiscoverExtension['id'];

export interface DiscoverExtensionRegistry {
  set: (extension: DiscoverExtension) => void;
  get$: <TExtensionId extends DiscoverExtensionId>(
    id: TExtensionId
  ) => Observable<Extract<DiscoverExtension, { id: TExtensionId }> | undefined>;
  enable: (id: DiscoverExtensionId) => void;
  disable: (id: DiscoverExtensionId) => void;
}

interface DiscoverExtensionRegistration {
  extension: DiscoverExtension;
  enabled: boolean;
}

export const createExtensionRegistry = (): DiscoverExtensionRegistry => {
  const update$ = new Subject<DiscoverExtensionId>();
  const registrations = new Map<DiscoverExtensionId, DiscoverExtensionRegistration>();

  return {
    set: (extension) => {
      const registration = registrations.get(extension.id);
      registrations.set(extension.id, { extension, enabled: registration?.enabled ?? true });
      update$.next(extension.id);
    },

    get$: <TExtensionId extends DiscoverExtensionId>(id: TExtensionId) => {
      return update$.pipe(
        startWith(id),
        filter((currentId) => currentId === id),
        map(() => {
          const registration = registrations.get(id);
          if (registration && registration.enabled) {
            return registration.extension as Extract<DiscoverExtension, { id: TExtensionId }>;
          }
        })
      );
    },

    enable: (id) => {
      const registration = registrations.get(id);
      if (registration && !registration.enabled) {
        registration.enabled = true;
        update$.next(registration.extension.id);
      }
    },

    disable: (id) => {
      const registration = registrations.get(id);
      if (registration && registration.enabled) {
        registration.enabled = false;
        update$.next(registration.extension.id);
      }
    },
  };
};
