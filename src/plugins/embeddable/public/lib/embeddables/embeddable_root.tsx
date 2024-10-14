/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { isPromise } from '@kbn/std';
import { MaybePromise } from '@kbn/utility-types';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { EmbeddableErrorHandler } from './embeddable_error_handler';

interface Props {
  embeddable?: IEmbeddable<EmbeddableInput, EmbeddableOutput, MaybePromise<ReactNode>>;
  loading?: boolean;
  error?: string;
  input?: EmbeddableInput;
}

export const EmbeddableRoot: React.FC<Props> = ({ embeddable, loading, error, input }) => {
  const [node, setNode] = useState<ReactNode | undefined>();
  const [embeddableHasMounted, setEmbeddableHasMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const updateNode = useCallback((newNode: MaybePromise<ReactNode>) => {
    if (isPromise(newNode)) {
      newNode.then(updateNode);
      return;
    }

    setNode(newNode);
  }, []);

  useEffect(() => {
    if (!rootRef.current || !embeddable) {
      return;
    }

    setEmbeddableHasMounted(true);
    updateNode(embeddable.render(rootRef.current) ?? undefined);
    embeddable.render(rootRef.current);
  }, [updateNode, embeddable]);

  useEffect(() => {
    if (input && embeddable && embeddableHasMounted) {
      embeddable.updateInput(input);
    }
  }, [input, embeddable, embeddableHasMounted]);

  return (
    <>
      <div ref={rootRef}>{node}</div>
      {loading && <EuiLoadingSpinner data-test-subj="embedSpinner" />}
      {error && (
        <EmbeddableErrorHandler embeddable={embeddable} error={error}>
          {({ message }) => <EuiText data-test-subj="embedError">{message}</EuiText>}
        </EmbeddableErrorHandler>
      )}
    </>
  );
};
