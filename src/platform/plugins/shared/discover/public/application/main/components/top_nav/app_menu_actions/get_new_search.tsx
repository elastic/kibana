/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import { AppMenuActionId } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';

export const getNewSearchAppMenuItem = ({
  onNewSearch,
  newSearchUrl,
}: {
  onNewSearch: () => void;
  newSearchUrl?: string;
}): DiscoverAppMenuItemType => {
  return {
    id: AppMenuActionId.new,
    order: 1,
    label: i18n.translate('discover.localMenu.localMenu.newDiscoverSessionTitle', {
      defaultMessage: 'New',
    }),
    iconType: 'plusInCircle',
    testId: 'discoverNewButton',
    href: newSearchUrl,
    run: () => {
      onNewSearch();
    },
  };
};
