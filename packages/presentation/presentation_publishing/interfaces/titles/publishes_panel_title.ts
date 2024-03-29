/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '../../publishing_subject';

export interface PublishesPanelTitle {
  panelTitle: PublishingSubject<string | undefined>;
  hidePanelTitle: PublishingSubject<boolean | undefined>;
  defaultPanelTitle?: PublishingSubject<string | undefined>;
}

export function getPanelTitle(api: Partial<PublishesPanelTitle> | undefined): string | undefined {
  return api?.panelTitle?.value || api?.defaultPanelTitle?.value;
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
