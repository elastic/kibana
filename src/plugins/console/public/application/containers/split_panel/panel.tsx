/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { usePanelContext } from '../../contexts';

export interface Props {
  children: ReactNode[] | ReactNode;
  className?: string;

  /**
   * initial width of the panel in percents
   */
  initialWidth?: number;
  style?: CSSProperties;
}

export function Panel({ children, className, initialWidth = 100, style = {} }: Props) {
  const [width, setWidth] = useState(`${initialWidth}%`);
  const { registry } = usePanelContext();
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registry.registerPanel({
      width: initialWidth,
      setWidth(value) {
        setWidth(value + '%');
        this.width = value;
      },
      getWidth() {
        return divRef.current!.getBoundingClientRect().width;
      },
    });
  }, [initialWidth, registry]);

  return (
    <div className={className} ref={divRef} style={{ ...style, width, display: 'flex' }}>
      {children}
    </div>
  );
}
