/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ADD_PANEL_BUTTON_TEST_SUBJ = 'dashboardAddTopNavButton';

export const getAddPanelButton = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-test-subj="${ADD_PANEL_BUTTON_TEST_SUBJ}"]`);

export const getPanelElement = (panelId: string): HTMLElement | null =>
  document.getElementById(`panel-${panelId}`);
