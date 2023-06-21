/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import useAsync from 'react-use/lib/useAsync';

import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';

import { NavigationEmbeddable } from '../embeddable/navigation_embeddable';

interface Props {
  embeddable: NavigationEmbeddable;
}

export const NavigationEmbeddableDashboardPicker = ({ embeddable }: Props) => {
  const { loading: loadingDashboardList, value: dashboardList } = useAsync(async () => {
    return await embeddable.getDashboardList();
  }, []);

  useEffect(() => {
    console.log('dashboardList', dashboardList);
  }, [dashboardList]);

  return loadingDashboardList ? (
    <EuiLoadingSpinner />
  ) : (
    <EuiPanel>
      {(dashboardList?.hits ?? []).map((hit) => (
        <li key={hit.id}>{hit.attributes.title}</li>
      ))}
    </EuiPanel>
  );
};
