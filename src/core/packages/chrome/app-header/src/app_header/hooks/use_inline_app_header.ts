/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect, useRef } from 'react';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type { AppHeaderTitle } from '../../types';

/**
 * Claims the Chrome Next inline app-header slot so Chrome does not also render a chrome-owned header.
 */
export const useInlineAppHeader = (title?: AppHeaderTitle): void => {
  const chrome = useChromeService();
  const registrationRef = useRef<ReturnType<typeof chrome.next.inlineAppHeader.register>>();
  const titleRef = useRef(title);
  const publishedTitleRef = useRef(title);
  titleRef.current = title;

  useLayoutEffect(() => {
    const registration = chrome.next.inlineAppHeader.register(titleRef.current);
    registrationRef.current = registration;
    publishedTitleRef.current = titleRef.current;

    return () => {
      registration.unregister();
      registrationRef.current = undefined;
    };
  }, [chrome]);

  useLayoutEffect(() => {
    if (Object.is(publishedTitleRef.current, title)) {
      return;
    }

    publishedTitleRef.current = title;
    registrationRef.current?.update(title);
  }, [title]);
};
