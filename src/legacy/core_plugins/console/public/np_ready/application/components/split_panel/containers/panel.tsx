/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { usePanelContext } from '../context';

export interface Props {
  children: ReactNode[] | ReactNode;
  initialWidth?: string;
  style?: CSSProperties;
}

export function Panel({ children, initialWidth = '100%', style = {} }: Props) {
  const [width, setWidth] = useState(initialWidth);
  const { registry } = usePanelContext();
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registry.registerPanel({
      initialWidth,
      setWidth(value) {
        setWidth(value + '%');
      },
      getWidth() {
        return divRef.current!.getBoundingClientRect().width;
      },
    });
  }, [initialWidth, registry]);

  return (
    <div ref={divRef} style={{ ...style, width, display: 'flex' }}>
      {children}
    </div>
  );
}
