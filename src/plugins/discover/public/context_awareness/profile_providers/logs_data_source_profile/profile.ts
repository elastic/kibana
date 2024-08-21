/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { DataSourceCategory, DataSourceProfileProvider } from '../../profiles';
import { ProfileProviderServices } from '../profile_provider_services';
import { getRowIndicatorProvider } from './accessors';
import { extractIndexPatternFrom } from '../extract_index_pattern_from';
import { getCellRenderers } from './accessors';

export const createLogsDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider => ({
  profileId: 'logs-data-source-profile',
  profile: {
    getRowIndicatorProvider,
    getCellRenderers,
    getAdditionalCellActions: (prev) => () =>
      [
        ...prev(),
        {
          getDisplayName: (context) => `Heart ${context.field.name}`,
          getIconType: () => 'heart',
          execute: (context) => {
            const str = `${context.field.name} = ${JSON.stringify(
              omit(context, 'dataView'),
              null,
              2
            )}`;
            // eslint-disable-next-line no-console
            console.log(str);
            alert(str);
          },
        },
      ],
  },
  resolve: (params) => {
    const indexPattern = extractIndexPatternFrom(params);

    if (!services.logsContextService.isLogsIndexPattern(indexPattern)) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: { category: DataSourceCategory.Logs },
    };
  },
});
