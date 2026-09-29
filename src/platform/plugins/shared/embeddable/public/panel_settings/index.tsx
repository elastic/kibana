/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';
import type { PanelSettingsAccordionsProps } from './panel_settings_accordions';
import type { PanelEditFlyoutProps } from './panel_edit_flyout';
import type { PanelSettingsFlyoutSectionsProps } from './panel_settings_flyout_sections';

export type { HasPanelSettingsInEditFlyout, PanelSettingsApi, PanelSettingsState } from './types';
export { apiHasPanelSettingsInEditFlyout } from './types';
export type { PanelSettingsAccordionsProps } from './panel_settings_accordions';
export type { PanelEditFlyoutProps } from './panel_edit_flyout';
export type { PanelSettingsFlyoutSectionsProps } from './panel_settings_flyout_sections';
export { usePanelSettings } from './use_panel_settings';

const LazyPanelSettingsAccordions = React.lazy(() => import('./panel_settings_accordions'));
const LazyPanelEditFlyout = React.lazy(() => import('./panel_edit_flyout'));
const LazyPanelSettingsFlyoutSections = React.lazy(
  () => import('./panel_settings_flyout_sections')
);

/**
 * "Title and description" and "Panel options" accordions, used by edit flyouts to
 * change the panel settings alongside the panel configuration.
 */
export const PanelSettingsAccordions = (props: PanelSettingsAccordionsProps) => (
  <Suspense fallback={null}>
    <LazyPanelSettingsAccordions {...props} />
  </Suspense>
);

/**
 * Edit flyout for panels that are configured in a separate editor, showing a preview of the
 * panel, a link to the editor and the panel settings accordions.
 */
export const PanelEditFlyout = (props: PanelEditFlyoutProps) => (
  <Suspense fallback={null}>
    <LazyPanelEditFlyout {...props} />
  </Suspense>
);

/**
 * The panel settings accordions laid out for the body of a flyout, for panels with their own
 * editor flyout (e.g. links, image). Use `usePanelSettings` to track and apply the changes.
 */
export const PanelSettingsFlyoutSections = (props: PanelSettingsFlyoutSectionsProps) => (
  <Suspense fallback={null}>
    <LazyPanelSettingsFlyoutSections {...props} />
  </Suspense>
);
