/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlexPanelData } from '../grid_panel';
import type { FlexLayoutData } from '../types';

const comparePanels = (panelA: FlexPanelData, panelB: FlexPanelData) => panelA.order - panelB.order;

export const getPanelKeysInOrder = (panels: FlexLayoutData): string[] =>
  Object.keys(panels).sort((panelKeyA, panelKeyB) =>
    comparePanels(panels[panelKeyA], panels[panelKeyB])
  );
