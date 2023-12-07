/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FC } from 'react';

/**
 * This component allows errors to be caught outside of a render tree, and re-thrown within a render tree
 * wrapped by KibanaErrorBoundary. The purpose is to let KibanaErrorBoundary control the user experience when
 * React can not render due to an error.
 *
 * @public
 */
export const ThrowIfError: FC<{ error: Error | null }> = ({ error }) => {
  if (error) {
    throw error;
  }

  return null;
};
