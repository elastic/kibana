/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fastIsEqual from 'fast-deep-equal';
import { BehaviorSubject } from 'rxjs';
import {
  apiPublishesPanelDescription,
  apiPublishesPanelTitle,
  apiPublishesSavedObjectId,
  StateComparators,
} from '@kbn/presentation-publishing';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { PanelIncompatibleError } from '@kbn/embeddable-plugin/public';
import { LinksLayoutType, LINKS_VERTICAL_LAYOUT } from '../../common/content_management';
import { LinksParentApi, LinksRuntimeState, ResolvedLink } from '../types';
import { serializeLinksAttributes } from '../lib/serialize_attributes';

const isParentApiCompatible = (parentApi: unknown): parentApi is LinksParentApi =>
  apiIsPresentationContainer(parentApi) &&
  apiPublishesSavedObjectId(parentApi) &&
  apiPublishesPanelTitle(parentApi) &&
  apiPublishesPanelDescription(parentApi);

export function initializeLinks(state: LinksRuntimeState, parentApi: unknown) {
  if (!isParentApiCompatible(parentApi)) throw new PanelIncompatibleError();

  const error$ = new BehaviorSubject<Error | undefined>(state.error);

  const links$ = new BehaviorSubject<ResolvedLink[] | undefined>(state.links);
  const layout$ = new BehaviorSubject<LinksLayoutType | undefined>(state.layout);

  const defaultPanelTitle = new BehaviorSubject<string | undefined>(state.defaultPanelTitle);
  const defaultPanelDescription = new BehaviorSubject<string | undefined>(
    state.defaultPanelDescription
  );

  const getLinksComparators = (): StateComparators<
    Omit<LinksRuntimeState, 'savedObjectId' | 'title' | 'description' | 'hidePanelTitles'>
  > => {
    return {
      links: [links$, (nextLinks?: ResolvedLink[]) => links$.next(nextLinks ?? []), fastIsEqual],
      layout: [
        layout$,
        (nextLayout?: LinksLayoutType) => layout$.next(nextLayout ?? LINKS_VERTICAL_LAYOUT),
      ],
      error: [error$, (nextError?: Error) => error$.next(nextError)],
      defaultPanelDescription: [
        defaultPanelDescription,
        (nextDescription?: string) => defaultPanelDescription.next(nextDescription),
      ],
      defaultPanelTitle: [
        defaultPanelTitle,
        (nextTitle?: string) => defaultPanelTitle.next(nextTitle),
      ],
    };
  };

  return {
    linksApi: {
      defaultPanelTitle,
      defaultPanelDescription,
      blockingError: error$,
      isEditingEnabled: () => Boolean(error$.value === undefined),
      links$,
      layout$,
      parentApi,
    },
    linksComparators: getLinksComparators(),
    serializeLinks: () => {
      const attributes = {
        defaultPanelTitle: defaultPanelTitle.value,
        defaultPanelDescription: defaultPanelDescription.value,
        layout: layout$.value,
        links: links$.value,
      };
      return serializeLinksAttributes(attributes);
    },
  };
}
