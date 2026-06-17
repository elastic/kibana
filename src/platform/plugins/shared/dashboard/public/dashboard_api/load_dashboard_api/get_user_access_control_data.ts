/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { getAccessControlClient } from '../../services/access_control_service';
import { coreServices } from '../../services/kibana_services';

export const getUserAccessControlData = async () => {
  try {
    const accessControlClient = getAccessControlClient();
    const currentUser = await coreServices?.userProfile.getCurrent();
    const { isGloballyAuthorized } = await accessControlClient.checkGlobalPrivilege(
      DASHBOARD_SAVED_OBJECT_TYPE
    );

    if (!currentUser) {
      return;
    }

    return { uid: currentUser.uid, hasGlobalAccessControlPrivilege: isGloballyAuthorized };
  } catch (error) {
    return;
  }
};
