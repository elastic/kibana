/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '@kbn/presentation-publishing';

export interface CanSelectPanels {
  selectedPanelIds$: PublishingSubject<Set<string>>;
  togglePanelSelection: (id: string) => void;
}

/** Whether the parent container supports selecting its panels. */
export const apiCanSelectPanels = (api: unknown): api is CanSelectPanels =>
  typeof (api as Partial<CanSelectPanels> | undefined)?.togglePanelSelection === 'function' &&
  Boolean((api as Partial<CanSelectPanels> | undefined)?.selectedPanelIds$);
