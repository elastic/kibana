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
let enterpriseLicenseRequest: Promise<boolean> | undefined;

const loadEnterpriseLicense = (
  getLicense: NonNullable<ESQLEditorDeps['esql']>['getLicense']
): Promise<boolean> => {
  enterpriseLicenseRequest ??= getLicense()
    .then((license) => {
      enterpriseLicense = Boolean(
        license && license.status === 'active' && license.hasAtLeast('enterprise')
      );
      return enterpriseLicense;
    })
    .catch(() => {
      enterpriseLicense = false;
      return false;
    });
  return enterpriseLicenseRequest;
};

/** Drops the cached license so tests can change the result. */
export const clearNlToEsqlLicenseCache = (): void => {
  enterpriseLicense = undefined;
  enterpriseLicenseRequest = undefined;
};

export const useNlToEsqlCheck = (): boolean => {
  const getLicense = useKibana<ESQLEditorDeps>().services.esql?.getLicense;
  const [hasValidLicense, setHasValidLicense] = useState(enterpriseLicense ?? false);

  useEffect(() => {
    if (!getLicense) {
      return;
    }
    let cancelled = false;
    loadEnterpriseLicense(getLicense).then((isEnterprise) => {
      if (!cancelled) {
        setHasValidLicense(isEnterprise);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [getLicense]);

  return hasValidLicense;
};
