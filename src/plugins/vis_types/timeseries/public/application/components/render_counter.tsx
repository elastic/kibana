/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useLayoutEffect, ReactNode } from 'react';

interface RenderCounterProps {
  postponeExecution?: boolean;
  children?: ReactNode;
  initialRender: Function | undefined;
}

/** HOC component to call "initialRender" method after finishing all DOM mutations. **/
export const RenderCounter = ({
  initialRender,
  children,
  postponeExecution = false,
}: RenderCounterProps) => {
  useLayoutEffect(() => {
    if (!postponeExecution) {
      initialRender?.();
    }
  }, [initialRender, postponeExecution]);

  return children ?? null;
};
