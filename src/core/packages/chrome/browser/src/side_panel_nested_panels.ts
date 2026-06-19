/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

/** @public */
export interface SidePanelNestedPanelRenderProps {
  onItemClick: (item: { href: string; id: string; label: string }) => void;
}

/** @public */
export type SidePanelNestedPanelRenderer = (
  props: SidePanelNestedPanelRenderProps
) => ReactNode;

const renderers = new Map<string, SidePanelNestedPanelRenderer>();

/** @public */
export const registerSidePanelNestedPanelRenderer = (
  panelId: string,
  renderer: SidePanelNestedPanelRenderer
): void => {
  renderers.set(panelId, renderer);
};

/** @public */
export const getSidePanelNestedPanelRenderer = (
  panelId: string
): SidePanelNestedPanelRenderer | undefined => renderers.get(panelId);

/** @public */
export const renderSidePanelNestedPanel = (
  panelId: string,
  props: SidePanelNestedPanelRenderProps
): ReactNode => getSidePanelNestedPanelRenderer(panelId)?.(props) ?? null;
