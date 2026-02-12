/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { HttpStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { useQuery } from '@kbn/react-query';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
interface UseDataFieldsProps {
  query: string;
  http: HttpStart;
  dataViews: DataViewsPublicPluginStart;
}

export const useDataFields = ({ query, http, dataViews }: UseDataFieldsProps) => {
  const fieldsQuery = useQuery({
    queryKey: ['dataFields', query],
    queryFn: async () => {
      const dataView = await getESQLAdHocDataview({
        dataViewsService: dataViews,
        query,
        http,
      });

      if (!dataView) {
        return {};
      }

      const fields = dataView.fields.toSpec();
      return fields || {};
    },
    enabled: Boolean(query),
    refetchOnWindowFocus: false,
  });

  return fieldsQuery;
};
