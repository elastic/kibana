/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PublishesWritablePanelDescription,
  PublishesWritablePanelTitle,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { EmbeddableStateComparators } from './types';

export interface SerializedReactEmbeddableTitles {
  title?: string;
  description?: string;
  hidePanelTitles?: boolean;
}

export type ReactEmbeddableTitlesApi = PublishesWritablePanelTitle &
  PublishesWritablePanelDescription;

export const initializeReactEmbeddableTitles = (
  rawState: SerializedReactEmbeddableTitles
): {
  titlesApi: ReactEmbeddableTitlesApi;
  titleComparators: EmbeddableStateComparators<SerializedReactEmbeddableTitles>;
  serializeTitles: () => SerializedReactEmbeddableTitles;
} => {
  const panelTitle = new BehaviorSubject<string | undefined>(rawState.title);
  const panelDescription = new BehaviorSubject<string | undefined>(rawState.description);
  const hidePanelTitle = new BehaviorSubject<boolean | undefined>(rawState.hidePanelTitles);

  const setPanelTitle = (value: string | undefined) => panelTitle.next(value);
  const setHidePanelTitle = (value: boolean | undefined) => hidePanelTitle.next(value);
  const setPanelDescription = (value: string | undefined) => panelDescription.next(value);

  const titleComparators: EmbeddableStateComparators<SerializedReactEmbeddableTitles> = {
    title: [panelTitle, setPanelTitle],
    description: [panelDescription, setPanelDescription],
    hidePanelTitles: [hidePanelTitle, setHidePanelTitle, (a, b) => Boolean(a) === Boolean(b)],
  };

  const titlesApi = {
    panelTitle,
    hidePanelTitle,
    setPanelTitle,
    setHidePanelTitle,
    panelDescription,
    setPanelDescription,
  };

  return {
    serializeTitles: () => serializeReactEmbeddableTitles(titlesApi),
    titleComparators,
    titlesApi,
  };
};

export const serializeReactEmbeddableTitles = (
  titlesApi: ReactEmbeddableTitlesApi
): SerializedReactEmbeddableTitles => {
  return {
    title: titlesApi.panelTitle.value,
    hidePanelTitles: titlesApi.hidePanelTitle.value,
    description: titlesApi.panelDescription.value,
  };
};
