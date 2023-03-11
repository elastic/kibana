/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { EuiToolTip } from '@elastic/eui';

import { TooltipContent } from './tooltip_content';
import type { CaseTooltipProps } from './types';
import { Skeleton } from './skeleton';

const CaseTooltipComponent = React.memo<CaseTooltipProps>((props) => {
  const { dataTestSubj, children, loading = false, className = '', content } = props;

  return (
    <EuiToolTip
      data-test-subj={dataTestSubj ? dataTestSubj : 'cases-components-tooltip'}
      anchorClassName={className}
      content={loading ? <Skeleton /> : <TooltipContent {...content} />}
    >
      <>{children}</>
    </EuiToolTip>
  );
});

CaseTooltipComponent.displayName = 'Tooltip';

export const Tooltip = memo(CaseTooltipComponent);
