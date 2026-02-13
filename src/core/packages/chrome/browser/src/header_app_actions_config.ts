/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';

/** @public */
export interface ChromeHeaderAppActionsOverflowPanelItem {
  name: string;
  icon: string;
  onClick: () => void;
  panel?: number;
}

/** @public */
export interface ChromeHeaderAppActionsOverflowPanelSeparator {
  isSeparator: true;
  key: string;
}

/** @public */
export interface ChromeHeaderAppActionsOverflowPanelCustomItem {
  renderItem: () => React.ReactNode;
  key?: string;
}

/** @public */
export type ChromeHeaderAppActionsOverflowPanelListItem =
  | ChromeHeaderAppActionsOverflowPanelItem
  | ChromeHeaderAppActionsOverflowPanelSeparator
  | ChromeHeaderAppActionsOverflowPanelCustomItem;

/** @public */
export interface ChromeHeaderAppActionsOverflowPanel {
  id: number;
  title: string;
  items: ChromeHeaderAppActionsOverflowPanelListItem[];
}

/** @public */
export interface ChromeHeaderAppActionsSavePopoverItem {
  name: string;
  icon: string;
  onClick: () => void;
}

/** @public */
export interface ChromeHeaderAppActionsSavePopoverPanel {
  id: number;
  title: string;
  items: ChromeHeaderAppActionsSavePopoverItem[];
}

/**
 * Configuration for the global header app actions section (overflow menu, New, Share, Save).
 * Set by the current app via chrome.setHeaderAppActionsConfig(); cleared on app change.
 *
 * @public
 */
export interface ChromeHeaderAppActionsConfig {
  /** Panels for the overflow (•••) context menu */
  overflowPanels: ChromeHeaderAppActionsOverflowPanel[];
  /** Panels for the Save split-button dropdown (e.g. "Save as", "Reset changes") */
  savePopoverPanels: ChromeHeaderAppActionsSavePopoverPanel[];
}
