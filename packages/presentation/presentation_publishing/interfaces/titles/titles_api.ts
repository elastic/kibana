/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { StateComparators } from '../../comparators';
import { PublishesWritablePanelDescription } from './publishes_panel_description';
import { PublishesWritablePanelTitle } from './publishes_panel_title';

export interface SerializedTitles {
  title?: string;
  description?: string;
  hidePanelTitles?: boolean;
}

export const stateHasTitles = (state: unknown): state is SerializedTitles => {
  return (
    (state as SerializedTitles)?.title !== undefined ||
    (state as SerializedTitles)?.description !== undefined ||
    (state as SerializedTitles)?.hidePanelTitles !== undefined
  );
};

export interface TitlesApi extends PublishesWritablePanelTitle, PublishesWritablePanelDescription {}

export const initializeTitles = (
  rawState: SerializedTitles
): {
  titlesApi: TitlesApi;
  titleComparators: StateComparators<SerializedTitles>;
  serializeTitles: () => SerializedTitles;
} => {
  const panelTitle = new BehaviorSubject<string | undefined>(rawState.title);
  const panelDescription = new BehaviorSubject<string | undefined>(rawState.description);
  const hidePanelTitle = new BehaviorSubject<boolean | undefined>(rawState.hidePanelTitles);

  const setPanelTitle = (value: string | undefined) => panelTitle.next(value);
  const setHidePanelTitle = (value: boolean | undefined) => hidePanelTitle.next(value);
  const setPanelDescription = (value: string | undefined) => panelDescription.next(value);

  const titleComparators: StateComparators<SerializedTitles> = {
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
    serializeTitles: () => ({
      title: panelTitle.value,
      hidePanelTitles: hidePanelTitle.value,
      description: panelDescription.value,
    }),
    titleComparators,
    titlesApi,
  };
};
