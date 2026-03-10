/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, useEffect, useState } from 'react';

/**
 * @description See {@link https://github.com/elastic/kibana/issues/177756 | GitHub issue #177756} for the rationale behind this bug fix implementation
 */
export const ReBroadcastMouseDownEvents: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [$codeWrapper, setCodeWrapper] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const rebroadcastEvent = (event: MouseEvent) => {
      // rebroadcast mouse event to accommodate integration with other parts of the codebase
      // especially that the monaco it self does prevent default for mouse events
      if ($codeWrapper?.contains(event.target as Node) && event.defaultPrevented) {
        $codeWrapper.dispatchEvent(new MouseEvent(event.type, event));
      }
    };

    if ($codeWrapper) {
      $codeWrapper.addEventListener('mousedown', rebroadcastEvent);

      return () => $codeWrapper.removeEventListener('mousedown', rebroadcastEvent);
    }
  }, [$codeWrapper]);

  return (
    <div ref={setCodeWrapper} style={{ display: 'contents' }}>
      {children}
    </div>
  );
};
