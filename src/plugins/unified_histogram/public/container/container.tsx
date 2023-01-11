/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ForwardedRef, forwardRef, useImperativeHandle, useState } from 'react';

export interface UnifiedHistogramLayoutContainerApi {
  initialized: boolean;
  initialize: () => void;
}

export const UnifiedHistogramLayoutContainer = forwardRef(
  (props: any, ref: ForwardedRef<UnifiedHistogramLayoutContainerApi>) => {
    const [initialized, setInitialized] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        initialized,
        initialize: () => {
          if (initialized) {
            throw Error('Already initialized');
          }

          setInitialized(true);
        },
      }),
      [initialized]
    );

    return initialized ? <>INITIALIZED</> : <>NOT INITIALIZED</>;
  }
);
