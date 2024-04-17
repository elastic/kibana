/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fastIsEqual from 'fast-deep-equal';
import { BehaviorSubject, skip } from 'rxjs';
import { StateComparators } from '@kbn/presentation-publishing';
import { LinksDocument } from '../services/attribute_service';
import { LinksSerializedState, ResolvedLink } from './types';
import { resolveLinks } from './utils';
import { openEditorFlyout } from '../editor/open_editor_flyout';
import { loadFromLibrary } from '../content_management/load_from_library';

export async function initializeLinks(state: LinksSerializedState, parentApi: unknown) {
  const savedObjectId$ = new BehaviorSubject<string | undefined>(state.savedObjectId);

  const { attributes } = state.savedObjectId ? await loadFromLibrary(state.savedObjectId) : state;

  const resolvedLinks$ = new BehaviorSubject<ResolvedLink[]>(await resolveLinks(attributes.links));
  const error$ = new BehaviorSubject<Error | undefined>(undefined);

  const attributes$ = new BehaviorSubject(attributes);

  // whenever resolvedLinks$ changes, update links$ with the persistable state
  // title and description are not persisted
  resolvedLinks$.pipe(skip(1)).subscribe({
    next: (resolvedLinks) => {
      return {
        ...attributes$.value,
        links: resolvedLinks.map(({ title, description, ...link }) => link),
      };
    },
    error: (error) => error$.next(error),
  });

  const onEdit = async () => {
    try {
      await openEditorFlyout({
        initialState: state,
        parentDashboard: parentApi,
        resolvedLinks$,
        attributes$,
        savedObjectId$,
      });
    } catch {
      // do nothing, user cancelled
    }
  };

  const getLinksComparators = (): StateComparators<LinksSerializedState> => {
    if (savedObjectId$.getValue()) {
      return {
        savedObjectId: [
          savedObjectId$,
          (nextSavedObjectId?: string) => savedObjectId$.next(nextSavedObjectId),
        ],
      };
    }
    return {
      attributes: [
        attributes$,
        (nextAttributes?: LinksDocument) => attributes$.next(nextAttributes ?? { title: '' }),
        fastIsEqual,
      ],
    };
  };

  return {
    linksApi: {
      blockingError: error$,
      onEdit,
      resolvedLinks$,
      attributes$,
      savedObjectId$,
    },
    linksComparators: getLinksComparators(),
    serializeLinks: () => {
      if (savedObjectId$.value) {
        return {
          savedObjectId: savedObjectId$.value,
        };
      }
      return {
        attributes: attributes$.value,
      };
    },
  };
}
