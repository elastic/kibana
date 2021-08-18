/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';

// TODO: I have to use any here for now, but once this is available below, we should use the correct types, https://github.com/elastic/kibana/issues/100715
// import { Capabilities } from 'kibana/public';
type Capabilities = any;
export interface UseGetUserAlertsPermissionsProps {
  crud: boolean;
  read: boolean;
  loading: boolean;
}

export const useGetUserAlertsPermissions = (
  uiCapabilities: Capabilities,
  featureId: string
): UseGetUserAlertsPermissionsProps => {
  const [alertsPermissions, setAlertsPermissions] = useState<UseGetUserAlertsPermissionsProps>({
    crud: false,
    read: false,
    loading: true,
  });

  useEffect(() => {
    const capabilitiesCanUserCRUD: boolean =
      typeof uiCapabilities[featureId].crud_alerts === 'boolean'
        ? uiCapabilities[featureId].crud_alerts
        : false;
    const capabilitiesCanUserRead: boolean =
      typeof uiCapabilities[featureId].read_alerts === 'boolean'
        ? uiCapabilities[featureId].read_alerts
        : false;
    setAlertsPermissions({
      crud: capabilitiesCanUserCRUD,
      read: capabilitiesCanUserRead,
      loading: false,
    });
  }, [featureId, uiCapabilities]);

  return alertsPermissions;
};
