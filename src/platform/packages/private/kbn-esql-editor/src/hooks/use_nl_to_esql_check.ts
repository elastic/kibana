/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ESQLEditorDeps } from '../types';

export const useNlToEsqlCheck = (): boolean => {
  const kibana = useKibana<ESQLEditorDeps>();
  const { esql } = kibana.services;
  const getLicense = esql?.getLicense;
  const [hasValidLicense, setHasValidLicense] = useState(false);
  const licenseCheckRef = useRef(false);

  useEffect(() => {
    if (!getLicense || licenseCheckRef.current) return;
    licenseCheckRef.current = true;
    getLicense().then((license) => {
      setHasValidLicense(
        Boolean(license && license.status === 'active' && license.hasAtLeast('enterprise'))
      );
    });
  }, [getLicense]);

  return hasValidLicense;
};
