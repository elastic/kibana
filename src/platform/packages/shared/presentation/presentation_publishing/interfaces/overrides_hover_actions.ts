/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

/**
 * An interface which determines whether the hover actions are overridden by the embeddable
 */
export interface OverridesHoverActions {
  overrideHoverActions$: BehaviorSubject<boolean>;
  OverriddenHoverActionsComponent: React.ComponentType;
}

/**
 * A type guard which determines whether or not a given API overrides the hover actions.
 */
export const overridesHoverActions = (unknownApi: unknown): unknownApi is OverridesHoverActions => {
  return Boolean(
    unknownApi &&
       (unknownApi as OverridesHoverActions)?.overrideHoverActions$ !== undefined &&
      (unknownApi as OverridesHoverActions).OverriddenHoverActionsComponent !== undefined 
  );
};

