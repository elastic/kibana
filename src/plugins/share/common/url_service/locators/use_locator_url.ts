/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DependencyList, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import type { SerializableRecord } from '@kbn/utility-types';
import { LocatorGetUrlParams, LocatorPublic } from '..';

export const useLocatorUrl = <P extends SerializableRecord>(
  locator: LocatorPublic<P> | null | undefined,
  params: P,
  getUrlParams?: LocatorGetUrlParams,
  deps: DependencyList = []
): string => {
  const [url, setUrl] = useState<string>('');
  const isMounted = useMountedState();

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!locator) {
      setUrl('');
      return;
    }

    locator
      .getUrl(params, getUrlParams)
      .then((result: string) => {
        if (!isMounted()) return;
        setUrl(result);
      })
      .catch((error) => {
        if (!isMounted()) return;
        // eslint-disable-next-line no-console
        console.error('useLocatorUrl', error);
        setUrl('');
      });
  }, [locator, ...deps]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return url;
};
