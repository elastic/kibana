/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useState, useEffect } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { getFields } from '../utils';

interface UseDataFieldsProps {
  query: string;
  http: HttpStart;
  dataViews: DataViewsPublicPluginStart;
}

export const useDataFields = ({ query, http, dataViews }: UseDataFieldsProps) => {
  const [fields, setFields] = useState<Array<{ name: string; type: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!query) {
        setFields([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const dataView = await getESQLAdHocDataview({
          dataViewsService: dataViews,
          query,
          http,
        });

        if (dataView) {
          const fetchedFields = await getFields(http, [dataView.getIndexPattern()]);
          setFields(fetchedFields);
        } else {
          setFields([]);
        }
      } catch (e: any) {
        setError(e);
        setFields([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [query, http, dataViews]);

  return { fields, isLoading, error };
};
