/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ContentSourceContainerProps } from './content_source_container';

export type ContentSourceProps = ContentSourceContainerProps;

const ContentSourceContainer = React.lazy(() =>
  import('./content_source_container').then(
    ({ ContentSourceContainer: _ContentSourceContainer }) => ({
      default: _ContentSourceContainer,
    })
  )
);

export const ContentSourceLoader: React.FC<ContentSourceContainerProps> = (props) => {
  return (
    <React.Suspense fallback={<></>}>
      <ContentSourceContainer {...props} />
    </React.Suspense>
  );
};
