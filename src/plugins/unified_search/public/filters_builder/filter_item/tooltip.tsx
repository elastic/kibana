/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiToolTip, EuiToolTipProps } from '@elastic/eui';

export type TooltipProps = Partial<Omit<EuiToolTipProps, 'content'>> & {
  content: string;
  show: boolean;
};

export const Tooltip: React.FC<TooltipProps> = ({ children, show, content, ...tooltipProps }) => (
  <>
    {show ? (
      <EuiToolTip content={content} delay="long" {...tooltipProps}>
        <>{children}</>
      </EuiToolTip>
    ) : (
      children
    )}
  </>
);
