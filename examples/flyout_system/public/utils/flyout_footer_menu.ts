/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlyoutFooterMenuPanel } from '@kbn/flyout-template';

const log = (action: string) => () => {
  console.log(`footer action menu: ${action}`); // eslint-disable-line no-console
};

/**
 * Panels for `Footer.PrimaryActionMenu`, shared by both widgets so the accessibility suite can
 * assert the same menu either way. Module scope keeps the array reference stable across renders,
 * which is what the prop's `useMemo` guidance asks for.
 *
 * The nested panel carries a `title`, without which EUI renders no back button.
 */
export const FOOTER_MENU_PANELS: FlyoutFooterMenuPanel[] = [
  {
    id: 'actions',
    'data-test-subj': 'footerMenuActionsPanel',
    items: [
      { name: 'Add to case', icon: 'plusInCircle', onClick: log('add to case') },
      { name: 'Copy link', icon: 'link', onClick: log('copy link') },
      { name: 'More actions', icon: 'boxesVertical', panel: 'moreActions' },
      { isSeparator: true },
      { name: 'Export as PDF', icon: 'export', onClick: log('export') },
    ],
  },
  {
    id: 'moreActions',
    title: 'More actions',
    items: [
      { name: 'Archive', icon: 'folderCheck', onClick: log('archive') },
      { name: 'Delete', icon: 'trash', color: 'danger', onClick: log('delete') },
    ],
  },
];
