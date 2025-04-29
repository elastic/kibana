/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip } from '@elastic/eui';
import type { FC, PropsWithChildren } from 'react';
import React, { useLayoutEffect, useRef, useState } from 'react';

export const TextTruncate: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useLayoutEffect(() => {
    if (textRef.current) {
      const { clientWidth, scrollWidth } = textRef.current;
      setShowTooltip(scrollWidth > clientWidth);
    }
  }, [children]);

  const truncated = (
    <span ref={textRef} className="eui-displayBlock eui-textTruncate">
      {children}
    </span>
  );

  if (showTooltip) {
    return (
      <EuiToolTip position="top" content={children} anchorClassName="eui-displayBlock">
        {truncated}
      </EuiToolTip>
    );
  }

  return truncated;
};
