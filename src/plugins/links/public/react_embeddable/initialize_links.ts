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
import { LinksInput } from '../embeddable/types';
import { getLinksAttributeService } from '../services/attribute_service';
import { LinksSerializedState, ResolvedLink } from './types';
import { resolveLinks } from './utils';
import { LinksLayoutType } from '../../common/content_management';
import { openEditorFlyout } from '../editor/open_editor_flyout';

export async function initializeLinks(state: LinksSerializedState, parentApi: unknown) {
  const savedObjectId$ = new BehaviorSubject<string | undefined>(state.savedObjectId);
  const linksInput = state as unknown as LinksInput;
  const attributeService = getLinksAttributeService();
  const { attributes } = await attributeService.unwrapAttributes(linksInput);

  const resolvedLinks$ = new BehaviorSubject<ResolvedLink[]>(await resolveLinks(attributes.links));
  const error$ = new BehaviorSubject<Error | undefined>(undefined);
  const links$ = new BehaviorSubject(attributes.links);
  const layout$ = new BehaviorSubject(attributes.layout);

  // whenever resolvedLinks$ changes, update links$ with the persistable state
  // title and description are not persisted
  resolvedLinks$.pipe(skip(1)).subscribe({
    next: (resolvedLinks) => {
      console.log('resolvedLinks', resolvedLinks);
      return links$.next(resolvedLinks.map(({ title, description, ...link }) => link));
    },
    error: (error) => error$.next(error),
  });

  const onEdit = async () => {
    try {
      await openEditorFlyout({
        state,
        parentDashboard: parentApi,
        resolvedLinks$,
        layout$,
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
          (a, b) => {
            console.log(a, b);
            return a === b;
          },
        ],
      };
    }
    return {
      links: [
        links$,
        (nextLinks?: Link[]) => {
          console.log('nextLinks', nextLinks);
          return links$.next(nextLinks ?? []);
        },
        (a, b) => {
          console.log('before', a, 'after', b);
          return fastIsEqual(a, b);
        },
      ],
      layout: [layout$, (nextLayout?: LinksLayoutType) => layout$.next(nextLayout)],
    };
  };

  return {
    linksApi: {
      blockingError: error$,
      onEdit,
      links$,
      resolvedLinks$,
      layout$,
      savedObjectId$,
    },
    linksComparators: getLinksComparators(),
    serializeLinks: () => {
      if (savedObjectId$.getValue()) {
        return {
          savedObjectId: savedObjectId$.getValue(),
        };
      }
      return {
        attributes: {
          links: links$.getValue(),
          layout: layout$.getValue(),
        },
      };
    },
  };
}
