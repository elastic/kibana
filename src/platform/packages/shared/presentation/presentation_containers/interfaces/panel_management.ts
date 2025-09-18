/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '@kbn/presentation-publishing/publishing_subject';
import { CONTROL_TYPES, type ControlType } from '@kbn/controls-constants';
import { apiIsOneOfType } from '@kbn/presentation-publishing';

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

// Disable duplication or expansions on panels with a control type
// TypeScript lacks support for negated types as https://github.com/microsoft/TypeScript/pull/29317 was never merged
// Therefore, we can't define types like IsDuplicable { type: string not ControlType }
interface IsNotDuplicable {
  type: ControlType;
}

export const apiCannotBeDuplicated = (
  unknownApi: unknown | null
): unknownApi is IsNotDuplicable => {
  return apiIsOneOfType(unknownApi as IsNotDuplicable, CONTROL_TYPES);
};

// Control panels cannot be expanded or duplicated, so copy the logic for duplicate to expand
type IsNotExpandable = IsNotDuplicable;
export const apiCannotBeExpanded = (unknownApi: unknown | null): unknownApi is IsNotExpandable =>
  apiCannotBeDuplicated(unknownApi);
