/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, Suspense, lazy } from 'react';
import { EuiLoadingChart, euiScrollBarStyles, type UseEuiTheme } from '@elastic/eui';
import classNames from 'classnames';
import { css } from '@emotion/react';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

export interface VisualizationContainerProps {
  'data-test-subj'?: string;
  className?: string;
  children: ReactNode;
  handlers: IInterpreterRenderHandlers;
  renderComplete?: () => void;
  showNoResult?: boolean;
  error?: string;
}

const VisualizationNoResults = lazy(() => import('./visualization_noresults'));
const VisualizationError = lazy(() => import('./visualization_error'));

const visualizationContainerStyles = {
  inEmbPanel: (euiThemeContext: UseEuiTheme) =>
    css`
      .embPanel & {
        ${euiScrollBarStyles(euiThemeContext)}; /* Force a better looking scrollbar */
      }
    `,
};

export const VisualizationContainer = ({
  'data-test-subj': dataTestSubj = '',
  className,
  children,
  handlers,
  showNoResult = false,
  error,
  renderComplete,
}: VisualizationContainerProps) => {
  const styles = useMemoCss(visualizationContainerStyles);
  const classes = classNames('visualization', className);

  const fallBack = (
    <div className="visChart__spinner">
      <EuiLoadingChart size="l" />
    </div>
  );

  return (
    <div data-test-subj={dataTestSubj} className={classes} css={styles.inEmbPanel}>
      <Suspense fallback={fallBack}>
        {error ? (
          <VisualizationError onInit={() => handlers.done()} error={error} />
        ) : showNoResult ? (
          <VisualizationNoResults
            onInit={() => (renderComplete ? renderComplete() : handlers.done())}
          />
        ) : (
          children
        )}
      </Suspense>
    </div>
  );
};
