/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import {type ContentContextValue, context} from './context';

export const useContent = (): ContentContextValue => {
  const contextValue = React.useContext(context);

  if (!contextValue) {
    throw new Error('Content context is not available');
  }

  return contextValue;
}
