/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { LabelBadge } from './label_badge';

export const NavItemLabel: React.FC<{
  item: ChromeProjectNavigationNode;
}> = ({ item: { title, openInNewTab, withBadge, badgeOptions } }) => {
  return (
    <>
      {title} {openInNewTab && <EuiIcon type="popout" size="s" />}
      {withBadge && <LabelBadge text={badgeOptions?.text} />}
    </>
  );
};
