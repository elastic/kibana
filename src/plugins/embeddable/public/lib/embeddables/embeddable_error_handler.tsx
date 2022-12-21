/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFunction } from 'lodash';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { isPromise } from '@kbn/std';
import type { MaybePromise } from '@kbn/utility-types';
import type { ErrorLike } from '@kbn/expressions-plugin/common';
import type { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';

type IReactEmbeddable = IEmbeddable<EmbeddableInput, EmbeddableOutput, MaybePromise<ReactNode>>;

interface EmbeddableErrorHandlerProps {
  children: IReactEmbeddable['catchError'];
  embeddable?: IReactEmbeddable;
  error: ErrorLike | string;
}

export function EmbeddableErrorHandler({
  children,
  embeddable,
  error,
}: EmbeddableErrorHandlerProps) {
  const [node, setNode] = useState<ReactNode>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const handler = embeddable?.catchError?.bind(embeddable) ?? children;
    if (!handler) {
      return;
    }

    const renderedNode = handler(
      typeof error === 'string' ? { message: error, name: '' } : error,
      ref.current
    );
    if (isFunction(renderedNode)) {
      return renderedNode;
    }
    if (isPromise(renderedNode)) {
      renderedNode.then(setNode);
    } else {
      setNode(renderedNode);
    }
  }, [children, embeddable, error]);

  return <div ref={ref}>{node}</div>;
}
