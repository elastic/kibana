/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { ReactNode, Suspense } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import classNames from 'classnames';
import { VisualizationNoResults } from './visualization_noresults';
import { IInterpreterRenderHandlers } from '../../../expressions/common';

interface VisualizationContainerProps {
  'data-test-subj'?: string;
  className?: string;
  children: ReactNode;
  handlers: IInterpreterRenderHandlers;
  showNoResult?: boolean;
}

export const VisualizationContainer = ({
  'data-test-subj': dataTestSubj = '',
  className,
  children,
  handlers,
  showNoResult = false,
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
        {showNoResult ? <VisualizationNoResults onInit={() => handlers.done()} /> : children}
      </Suspense>
    </div>
  );
};
