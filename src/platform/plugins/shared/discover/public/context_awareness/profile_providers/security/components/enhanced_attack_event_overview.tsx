/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DocViewRenderProps,
  DocViewRestorableStateProps,
} from '@kbn/unified-doc-viewer/types';
import type { SecuritySolutionAttackFlyoutOverviewTabFeature } from '@kbn/discover-shared-plugin/public';

const noop = () => {};

export interface EnhancedAttackEventOverviewProps
  extends DocViewRenderProps,
    DocViewRestorableStateProps {
  overviewTab?: SecuritySolutionAttackFlyoutOverviewTabFeature;
  refreshData?: () => void;
}

export const EnhancedAttackEventOverview = ({
  hit,
  overviewTab,
  refreshData,
  ...docViewProps
}: EnhancedAttackEventOverviewProps) => {
  const handleAttackUpdated = refreshData ?? noop;

  return overviewTab
    ? overviewTab.render({ hit, ...docViewProps, onAttackUpdated: handleAttackUpdated })
    : null;
};
