/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../../publishing_subject';

/**
 * This API can select child panels (multi-selection used for bulk actions)
 */
export interface CanSelectPanels {
  selectedPanelIds$: PublishingSubject<string[]>;
  togglePanelSelection: (panelId: string) => void;
  clearPanelSelection: () => void;
}

/**
 * A type guard which can be used to determine if a given API can select child panels
 */
export const apiCanSelectPanels = (api: unknown): api is CanSelectPanels => {
  return (
    typeof (api as CanSelectPanels)?.togglePanelSelection === 'function' &&
    typeof (api as CanSelectPanels)?.clearPanelSelection === 'function' &&
    Boolean((api as CanSelectPanels)?.selectedPanelIds$)
  );
};
