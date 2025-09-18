/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '@kbn/presentation-publishing/publishing_subject';
import { CONTROL_TYPES, ESQL_CONTROL, type ControlType } from '@kbn/controls-constants';
import { apiIsOfType, apiIsOneOfType } from '@kbn/presentation-publishing';

export interface CanDuplicatePanels {
  duplicatePanel: (panelId: string) => void;
}

export const apiCanDuplicatePanels = (
  unknownApi: unknown | null
): unknownApi is CanDuplicatePanels => {
  return Boolean((unknownApi as CanDuplicatePanels)?.duplicatePanel !== undefined);
};

export interface CanExpandPanels {
  expandPanel: (panelId: string) => void;
  expandedPanelId$: PublishingSubject<string | undefined>;
}

export const apiCanExpandPanels = (unknownApi: unknown | null): unknownApi is CanExpandPanels => {
  return Boolean((unknownApi as CanExpandPanels)?.expandPanel !== undefined);
};

// Disable panel management on certain panels with a control type
// TypeScript lacks support for negated types as https://github.com/microsoft/TypeScript/pull/29317 was never merged
// Therefore, we can't define types like IsDuplicable { type: string not ControlType }
export interface IsNotDuplicable {
  type: typeof ESQL_CONTROL;
}

export const apiCannotBeDuplicated = (unknownApi: unknown | null): unknownApi is IsNotDuplicable =>
  apiIsOfType(unknownApi as IsNotDuplicable, ESQL_CONTROL);

export interface IsNotExpandable {
  type: ControlType;
}
export const apiCannotBeExpanded = (unknownApi: unknown | null): unknownApi is IsNotExpandable =>
  apiIsOneOfType(unknownApi as IsNotDuplicable, CONTROL_TYPES);

// Control panels cannot be expanded or customized, so copy the logic for expand to customize
export type IsNotCustomizable = IsNotDuplicable;
export const apiCannotBeCustomized = (
  unknownApi: unknown | null
): unknownApi is IsNotCustomizable => apiCannotBeExpanded(unknownApi);
