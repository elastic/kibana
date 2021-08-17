/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { RecursiveReadonly } from '@kbn/utility-types';

export interface UseGetUserAlertsPermissionsProps {
  crud: boolean;
  read: boolean;
  loading: boolean;
}

export const useGetUserAlertsPermissions = (
  uiCapabilities: RecursiveReadonly<Record<string, any>>,
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
