/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DependencyList } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorGetUrlParams, LocatorPublic } from '..';

export const useLocatorUrl = <P extends SerializableRecord>(
  locator: LocatorPublic<P> | null | undefined,
  params: P,
  getUrlParams?: LocatorGetUrlParams,
  deps: DependencyList = []
): string => {
  const [url, setUrl] = useState<string>('');
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!locator) {
      setUrl('');
      return;
    }

    locator
      .getUrl(params, getUrlParams)
      .then((result: string) => {
        if (!isMounted.current) return;
        setUrl(result);
      })
      .catch((error) => {
        if (!isMounted.current) return;
        // eslint-disable-next-line no-console
        console.error('useLocatorUrl', error);
        setUrl('');
      });
  }, [locator, ...deps]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return url;
};
