/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';
import type { PublishesRelatedPanels } from '../../publishes_related_panels';

/**
 * This API can indicate panels related to a certain child panel. Consumers determine
 * relatedness by subscribing to the rendered child's own `relatedPanels$` (auto-published
 * on every embeddable) and checking whether the indicated id is in the list.
 *
 * We are calling this "indicating" because "highlight" refers to something else and
 * "callout" is a kind of EUI element and naming things is the second hardest problem in
 * computer science.
 */
export interface CanIndicateRelatedChildren {
  setRelatedPanelsIndicatorId: (panelId?: string) => void;
  relatedPanelsIndicatorId$: BehaviorSubject<string | undefined>;
}

/**
 * A type guard which can be used to determine if a given API can indicate panels related to a certain child panel
 */
export const apiCanIndicateRelatedChildren = (api: unknown): api is CanIndicateRelatedChildren => {
  return (
    typeof (api as CanIndicateRelatedChildren)?.setRelatedPanelsIndicatorId === 'function' &&
    typeof (api as CanIndicateRelatedChildren)?.relatedPanelsIndicatorId$ !== 'undefined'
  );
};

/**
 * This API is capable of indicating its related siblings. Used to enable a user action to set this particular panel
 * as the relatedPanelsIndicatorId in a CanIndicateRelatedChildren
 */
export type CanIndicateRelatedSiblings = PublishesRelatedPanels & {
  canIndicateRelatedSiblings: boolean;
};

export const apiCanIndicateRelatedSiblings = (
  unknownApi: unknown | null
): unknownApi is CanIndicateRelatedSiblings =>
  Boolean((unknownApi as CanIndicateRelatedSiblings).canIndicateRelatedSiblings);
