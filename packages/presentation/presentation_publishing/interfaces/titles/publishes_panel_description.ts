/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublishingSubject } from '../../publishing_subject';

export interface PublishesPanelDescription {
  panelDescription: PublishingSubject<string | undefined>;
  defaultPanelDescription?: PublishingSubject<string | undefined>;
}

export function getPanelDescription(api: Partial<PublishesPanelDescription>): string | undefined {
  return api.panelDescription?.value ?? api.defaultPanelDescription?.value;
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
