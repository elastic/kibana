/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useResizeObserver } from '@elastic/eui';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { NodeDimensions } from '../../common/types';
import { LazyDebugComponent } from '.';

const Debug = withSuspense(LazyDebugComponent);

interface DebugComponentProps {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
  payload: any;
}

function DebugComponent({ onLoaded, parentNode, payload }: DebugComponentProps) {
  const parentNodeDimensions = useResizeObserver(parentNode);
  const [dimensions, setDimensions] = useState<NodeDimensions>({
    width: parentNode.offsetWidth,
    height: parentNode.offsetHeight,
  });

  const updateDebugView = useCallback(() => {
    setDimensions({
      width: parentNode.offsetWidth,
      height: parentNode.offsetHeight,
    });
    onLoaded();
  }, [parentNode, onLoaded]);

  useEffect(() => {
    updateDebugView();
  }, [parentNodeDimensions, updateDebugView]);

  return (
    <div style={dimensions}>
      <Debug payload={payload} />
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { DebugComponent as default };
