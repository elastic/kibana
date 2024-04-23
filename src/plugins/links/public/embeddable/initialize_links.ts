/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fastIsEqual from 'fast-deep-equal';
import { BehaviorSubject, distinctUntilKeyChanged, filter, switchMap } from 'rxjs';
import { StateComparators } from '@kbn/presentation-publishing';
import { apiIsPresentationContainer, PresentationContainer } from '@kbn/presentation-containers';
import { i18n } from '@kbn/i18n';
import { LinksAttributes } from '../../common/content_management';
import { LinksSerializedState, ResolvedLink } from './types';
import { resolveLinks } from './utils';
import { openEditorFlyout } from '../editor/open_editor_flyout';
import { loadFromLibrary } from '../content_management/load_from_library';
import { CONTENT_ID } from '../../common';

const isParentApiCompatible = (parentApi: unknown): parentApi is PresentationContainer =>
  apiIsPresentationContainer(parentApi);

export async function initializeLinks(
  state: LinksSerializedState,
  uuid: string,
  parentApi: unknown
) {
  if (!isParentApiCompatible(parentApi)) {
    throw new Error(
      i18n.translate('links.errors.incompatibleAction', {
        defaultMessage: 'Parent is incompatible',
      })
    );
  }
  const { attributes } = state.savedObjectId ? await loadFromLibrary(state.savedObjectId) : state;

  const error$ = new BehaviorSubject<Error | undefined>(undefined);
  const resolvedLinks$ = new BehaviorSubject<ResolvedLink[]>([]);

  const attributes$ = new BehaviorSubject(attributes);
  const savedObjectId$ = new BehaviorSubject<string | undefined>(state.savedObjectId);

  const defaultPanelTitle = new BehaviorSubject<string | undefined>(attributes?.title);
  const defaultPanelDescription = new BehaviorSubject<string | undefined>(attributes?.description);

  attributes$
    .pipe(
      filter(Boolean),
      distinctUntilKeyChanged('links'),
      switchMap(({ links }) => resolveLinks(links))
    )
    .subscribe({
      next: (resolvedLinks) => resolvedLinks$.next(resolvedLinks),
      error: (error) => error$.next(error),
    });

  const onEdit = async () => {
    try {
      const newState = await openEditorFlyout({
        initialState: state,
        parentDashboard: parentApi,
      });
      if (parentApi) {
        parentApi.replacePanel(uuid, {
          panelType: CONTENT_ID,
          initialState: newState,
        });
      }
    } catch {
      // do nothing, user cancelled
    }
  };

  const getLinksComparators = (): StateComparators<LinksSerializedState> => {
    if (savedObjectId$.value) {
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
        (nextAttributes?: LinksAttributes) => attributes$.next(nextAttributes ?? {}),
        fastIsEqual,
      ],
    };
  };

  return {
    linksApi: {
      defaultPanelTitle,
      defaultPanelDescription,
      blockingError: error$,
      onEdit,
      resolvedLinks$,
      attributes$,
      savedObjectId$,
      parentApi,
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
