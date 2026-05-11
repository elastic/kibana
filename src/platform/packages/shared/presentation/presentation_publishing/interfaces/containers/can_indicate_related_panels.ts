/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';

export type PanelRelationshipComparator = (a: string, b: string) => boolean;
/**
 * This API can indicate panels related to a certain child panel. We are calling this "indicating" because "highlight" refers to something else and
 * "callout" is a kind of EUI element and naming things is the second hardest problem in computer science.
 */
export interface CanIndicateRelatedPanels {
  setIndicateRelatedPanelsId: (panelId?: string) => void;
  indicateRelatedPanelsId$: BehaviorSubject<string | undefined>;
  arePanelsRelated$: BehaviorSubject<PanelRelationshipComparator>;
}

/**
 * A type guard which can be used to determine if a given API can indicate panels related to a certain child panel
 */
export const apiCanIndicateRelatedPanels = (api: unknown): api is CanIndicateRelatedPanels => {
  return (
    typeof (api as CanIndicateRelatedPanels)?.setIndicateRelatedPanelsId === 'function' &&
    typeof (api as CanIndicateRelatedPanels)?.indicateRelatedPanelsId$ !== 'undefined'
  );
};
