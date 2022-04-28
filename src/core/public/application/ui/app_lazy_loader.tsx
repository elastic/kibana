/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useEffect } from 'react';
import { EuiLoadingElastic } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface AppLazyLoaderProps {
  appUrl: string;
  ensureDependenciesLoaded: (path: string) => Promise<void>;
}

export const AppLazyLoader: FC<AppLazyLoaderProps> = ({
  appUrl,
  ensureDependenciesLoaded,
  children,
}) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadDependencies = async () => {
      await ensureDependenciesLoaded(appUrl);
      setLoaded(true);
    };
    loadDependencies();
  }, [appUrl, ensureDependenciesLoaded]);

  // TODO
  console.log('AppLazyLoader', loaded);

  if (loaded) {
    return <>{children}</>;
  } else {
    return (
      <EuiLoadingElastic
        className="appContainer__loading"
        aria-label={i18n.translate('core.application.appContainer.loadingAriaLabel', {
          defaultMessage: 'Loading application',
        })}
        size="xxl"
      />
    );
  }
};
