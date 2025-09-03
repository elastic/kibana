/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from '../../services/kibana_services';

export const getBulkAuthorNames = async (ids: Array<string | undefined>) => {
  if (ids.length === 0 || ids.every((id) => id === undefined)) {
    return [];
  }

  try {
    const profiles = await coreServices.userProfile.bulkGet({
      uids: new Set(ids.filter((id): id is string => !!id)),
    });

    return profiles.map((profile) => ({ id: profile.uid, username: profile.user.username }));
  } catch (e) {
    return [];
  }
};
