/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import type { DocViewRenderProps } from '../../types';

interface Props {
  id: string;
  renderProps: DocViewRenderProps;
  title: string;
  component: React.ComponentType<DocViewRenderProps>;
}

/**
 * Renders the tab content of a doc view.
 * Displays an error message when it encounters exceptions, thanks to
 * Error Boundaries.
 */
export const DocViewerTab = (props: Props) => {
  const { component: Component, renderProps, title } = props;

  return (
    <KibanaSectionErrorBoundary sectionName={title}>
      <Component {...renderProps} />
    </KibanaSectionErrorBoundary>
  );
};
