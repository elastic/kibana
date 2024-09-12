/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { isPreviewBanner, PreviewBanner } from '../components/preview_section';
import { FlyoutPanelProps, useExpandableFlyoutState } from '../..';
import { Panel } from '../types';

export interface UseSectionsParams {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
}

export interface UseSectionsResult {
  /**
   * The left section to be displayed in the flyout.
   */
  leftSection: Panel | undefined;
  /**
   * The right section to be displayed in the flyout.
   */
  rightSection: Panel | undefined;
  /**
   * The preview section to be displayed in the flyout.
   */
  previewSection: Panel | undefined;
  /**
   * The most recent preview information to be displayed in the preview section.
   */
  mostRecentPreview: FlyoutPanelProps | undefined;
  /**
   * The preview banner to be displayed in preview section.
   */
  previewBanner: PreviewBanner | undefined;
}

/**
 * Hook that retrieves the left, right, and preview sections to be displayed in the flyout.
 */
export const useSections = ({ registeredPanels }: UseSectionsParams): UseSectionsResult => {
  const { left, preview, right } = useExpandableFlyoutState();

  const rightSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === right?.id),
    [right, registeredPanels]
  );
  const leftSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === left?.id),
    [left, registeredPanels]
  );
  // retrieve the last preview panel (most recent)
  const mostRecentPreview = useMemo(
    () => (preview ? preview[preview.length - 1] : undefined),
    [preview]
  );
  const previewSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === mostRecentPreview?.id),
    [mostRecentPreview, registeredPanels]
  );
  const previewBanner = useMemo(
    () =>
      isPreviewBanner(mostRecentPreview?.params?.banner)
        ? mostRecentPreview?.params?.banner
        : undefined,
    [mostRecentPreview?.params?.banner]
  );

  return useMemo(
    () => ({
      leftSection,
      rightSection,
      previewSection,
      previewBanner,
      mostRecentPreview,
    }),
    [leftSection, rightSection, previewSection, previewBanner, mostRecentPreview]
  );
};
