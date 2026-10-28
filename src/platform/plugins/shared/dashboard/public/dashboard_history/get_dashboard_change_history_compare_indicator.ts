/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  ChangeHistoryCompareIndicator,
  ChangeHistoryCompareSpec,
  ChangeHistoryDetail,
} from '@kbn/change-history-ui';

import { DASHBOARD_UNSAVED_CHANGES_ACTION } from '../../common/constants';
import { unsavedChangesBadgeStrings } from '../dashboard_app/_dashboard_app_strings';

const getVersion = ({ metadata }: ChangeHistoryDetail): number | undefined =>
  typeof metadata?.version === 'number' ? metadata.version : undefined;

/** version labels for the diff headers. Baseline = older side; target = newer / selected side. */
export const getDashboardChangeHistoryCompareIndicator = ({
  baseline,
  target,
}: ChangeHistoryCompareSpec): ChangeHistoryCompareIndicator => {
  const currentVersion = getVersion(target);
  const baselineVersion = getVersion(baseline);

  if (currentVersion != null) {
    return { baselineVersion, currentVersion };
  }

  if (target.action === DASHBOARD_UNSAVED_CHANGES_ACTION) {
    return {
      baselineVersion,
      currentBadgeLabel: unsavedChangesBadgeStrings.getUnsavedChangedBadgeText(),
      currentBadgeColor: 'warning',
    };
  }

  if (target.isCurrent) {
    return {
      baselineVersion,
      currentBadgeLabel: i18n.translate('dashboard.changeHistory.currentVersionBadge', {
        defaultMessage: 'Current version',
      }),
      currentBadgeColor: 'hollow',
    };
  }

  return { baselineVersion };
};
