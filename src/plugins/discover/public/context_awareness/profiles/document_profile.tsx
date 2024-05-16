/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { Profile } from '../composable_profile';
import { ProfileService } from '../profile_service';
import { DataTableRecordWithProfile } from '../types';

export enum DocumentType {
  Log = 'log',
  Default = 'default',
}

export interface DocumentProfileProviderParams {
  record: DataTableRecord;
}

export interface DocumentContext {
  type: DocumentType;
}

export type DocumentProfile = Pick<Profile, 'getDocViewsRegistry'>;

export const documentProfileService = new ProfileService<
  DocumentProfile,
  DocumentProfileProviderParams,
  DocumentContext
>();

export type DocumentProfileProvider = Parameters<typeof documentProfileService.registerProvider>[0];

export const recordHasProfile = (
  record?: DataTableRecord
): record is DataTableRecordWithProfile => {
  return Boolean(record && 'profile' in record);
};

documentProfileService.registerProvider({
  order: 0,
  profile: {
    getDocViewsRegistry: (prev) => (registry) => {
      registry.enableById('doc_view_logs_overview');
      return prev(registry);
    },
  },
  resolve: (params) => {
    if ('message' in params.record.flattened && params.record.flattened.message != null) {
      return {
        isMatch: true,
        context: {
          type: DocumentType.Log,
        },
      };
    }

    return { isMatch: false };
  },
});
