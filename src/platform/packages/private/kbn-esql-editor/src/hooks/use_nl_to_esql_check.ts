/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ESQLEditorDeps } from '../types';

let enterpriseLicense: boolean | undefined;

/** Drops the last known license result so tests can change it. */
export const clearNlToEsqlLicenseCache = (): void => {
  enterpriseLicense = undefined;
};

export const useNlToEsqlCheck = (): boolean => {
  const hasEnterpriseLicense = useKibana<ESQLEditorDeps>().services.esql?.hasEnterpriseLicense;
  const [hasValidLicense, setHasValidLicense] = useState(enterpriseLicense ?? false);

  useEffect(() => {
    if (!hasEnterpriseLicense) {
      return;
    }
    let cancelled = false;
    hasEnterpriseLicense().then((isEnterprise) => {
      enterpriseLicense = isEnterprise;
      if (!cancelled) {
        setHasValidLicense(isEnterprise);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasEnterpriseLicense]);

  return hasValidLicense;
};
