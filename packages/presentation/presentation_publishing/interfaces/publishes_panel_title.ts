/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject, useStateFromPublishingSubject } from '../publishing_subject';

export interface PublishesPanelTitle {
  panelTitle: PublishingSubject<string | undefined>;
  hidePanelTitle: PublishingSubject<boolean | undefined>;
  defaultPanelTitle?: PublishingSubject<string | undefined>;
}

export function getPanelTitle(api: Partial<PublishesPanelTitle>): string | undefined {
  return api.panelTitle?.value || api.defaultPanelTitle?.value;
}

export type PublishesWritablePanelTitle = PublishesPanelTitle & {
  setPanelTitle: (newTitle: string | undefined) => void;
  setHidePanelTitle: (hide: boolean | undefined) => void;
};

export const apiPublishesPanelTitle = (
  unknownApi: null | unknown
): unknownApi is PublishesPanelTitle => {
  return Boolean(
    unknownApi &&
      (unknownApi as PublishesPanelTitle)?.panelTitle !== undefined &&
      (unknownApi as PublishesPanelTitle)?.hidePanelTitle !== undefined
  );
};

export const apiPublishesWritablePanelTitle = (
  unknownApi: null | unknown
): unknownApi is PublishesWritablePanelTitle => {
  return (
    apiPublishesPanelTitle(unknownApi) &&
    (unknownApi as PublishesWritablePanelTitle).setPanelTitle !== undefined &&
    (typeof (unknownApi as PublishesWritablePanelTitle).setPanelTitle === 'function' &&
      (unknownApi as PublishesWritablePanelTitle).setHidePanelTitle) !== undefined &&
    typeof (unknownApi as PublishesWritablePanelTitle).setHidePanelTitle === 'function'
  );
};

/**
 * A hook that gets this API's panel title as a reactive variable which will cause re-renders on change.
 */
export const usePanelTitle = (api: Partial<PublishesPanelTitle> | undefined) => {
  const title = useStateFromPublishingSubject(api?.panelTitle);
  const defaultTitle = useStateFromPublishingSubject(api?.defaultPanelTitle);
  return title || defaultTitle;
};

/**
 * A hook that gets this API's hide panel title setting as a reactive variable which will cause re-renders on change.
 */
export const useHidePanelTitle = (api: Partial<PublishesPanelTitle> | undefined) =>
  useStateFromPublishingSubject(api?.hidePanelTitle);

/**
 * A hook that gets this API's default title as a reactive variable which will cause re-renders on change.
 */
export const useDefaultPanelTitle = (api: Partial<PublishesPanelTitle> | undefined) =>
  useStateFromPublishingSubject(api?.defaultPanelTitle);
