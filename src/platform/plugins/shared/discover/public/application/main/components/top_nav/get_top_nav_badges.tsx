/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getManagedContentBadge } from '@kbn/managed-content-badge';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';

/**
 * Helper function to build the top nav badges
 */
export const getTopNavBadges = ({
  isManaged,
}: {
  isManaged: boolean;
}): ChromeBreadcrumbsBadge[] => {
  const entries: ChromeBreadcrumbsBadge[] = [];

  if (isManaged) {
    entries.push(
      getManagedContentBadge(
        i18n.translate('discover.topNav.managedContentLabel', {
          defaultMessage:
            'This Discover session is managed by Elastic. Changes here must be saved to a new Discover session.',
        })
      )
    );
  }

  return entries;
};
