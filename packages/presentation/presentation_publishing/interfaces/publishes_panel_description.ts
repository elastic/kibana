/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject, useStateFromPublishingSubject } from '../publishing_subject';

export interface PublishesPanelDescription {
  panelDescription: PublishingSubject<string | undefined>;
  defaultPanelDescription?: PublishingSubject<string | undefined>;
}

export type PublishesWritablePanelDescription = PublishesPanelDescription & {
  setPanelDescription: (newTitle: string | undefined) => void;
};

export const apiPublishesPanelDescription = (
  unknownApi: null | unknown
): unknownApi is PublishesPanelDescription => {
  return Boolean(
    unknownApi && (unknownApi as PublishesPanelDescription)?.panelDescription !== undefined
  );
};

export const apiPublishesWritablePanelDescription = (
  unknownApi: null | unknown
): unknownApi is PublishesWritablePanelDescription => {
  return (
    apiPublishesPanelDescription(unknownApi) &&
    (unknownApi as PublishesWritablePanelDescription).setPanelDescription !== undefined &&
    typeof (unknownApi as PublishesWritablePanelDescription).setPanelDescription === 'function'
  );
};

/**
 * A hook that gets this API's panel description as a reactive variable which will cause re-renders on change.
 */
export const usePanelDescription = (api: Partial<PublishesPanelDescription> | undefined) =>
  useStateFromPublishingSubject(api?.panelDescription);

/**
 * A hook that gets this API's default panel description as a reactive variable which will cause re-renders on change.
 */
export const useDefaultPanelDescription = (api: Partial<PublishesPanelDescription> | undefined) =>
  useStateFromPublishingSubject(api?.defaultPanelDescription);
