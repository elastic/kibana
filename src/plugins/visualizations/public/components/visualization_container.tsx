/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode, Suspense, lazy } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import classNames from 'classnames';

import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';

export interface VisualizationContainerProps {
  'data-test-subj'?: string;
  className?: string;
  children: ReactNode;
  handlers: IInterpreterRenderHandlers;
  showNoResult?: boolean;
  error?: string;
}

const VisualizationNoResults = lazy(() => import('./visualization_noresults'));
const VisualizationError = lazy(() => import('./visualization_error'));

export const VisualizationContainer = ({
  'data-test-subj': dataTestSubj = '',
  className,
  children,
  handlers,
  showNoResult = false,
  error,
}: VisualizationContainerProps) => {
  const classes = classNames('visualization', className);

  const fallBack = (
    <div className="visChart__spinner">
      <EuiLoadingChart mono size="l" />
    </div>
  );

  return (
    <div data-test-subj={dataTestSubj} className={classes}>
      <Suspense fallback={fallBack}>
        {error ? (
          <VisualizationError onInit={() => handlers.done()} error={error} />
        ) : showNoResult ? (
          <VisualizationNoResults onInit={() => handlers.done()} />
        ) : (
          children
        )}
      </Suspense>
    </div>
  );
};
