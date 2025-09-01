/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useMemo } from 'react';
import { of } from 'rxjs';
import type { DiscoverServices } from '../build_services';

export const useDiscoverServices = () => useKibana<DiscoverServices>().services;

export const useDiscoverServicesWithObservabilityCues = () => {
  const services = useDiscoverServices();
  
  // Get current solution type
  const activeSpace$ = useMemo(
    () => services.spaces?.getActiveSpace$() ?? of(undefined),
    [services.spaces]
  );
  const activeSpace = useObservable(activeSpace$);
  const solutionType = activeSpace?.solution;
  
  // Determine if observability cues should be shown
  const shouldShowObservabilityCues = solutionType !== 'oblt';
  
  return {
    ...services,
    shouldShowObservabilityCues,
  };
};
