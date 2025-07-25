/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import { useChromeObservable } from '../../store';

export const HeaderBadge: React.FC = () => {
  const badge = useChromeObservable((state) => state.badge$);

  if (badge == null) {
    return null;
  }

  return (
    <div css={({ euiTheme }) => ({ alignSelf: 'center', marginLeft: euiTheme.size.base })}>
      <EuiBetaBadge
        data-test-subj="headerBadge"
        data-test-badge-label={badge.text}
        tabIndex={0}
        label={badge.text}
        tooltipContent={badge.tooltip}
        iconType={badge.iconType}
      />
    </div>
  );
};
