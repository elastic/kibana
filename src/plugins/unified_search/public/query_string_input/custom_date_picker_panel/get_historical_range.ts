/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

export const getHistoricalRange = async (
  data: DataPublicPluginStart,
  dataView: DataView
): Promise<{ from: string; to: string } | null> => {
  if (!dataView?.timeFieldName) {
    return null;
  }

  try {
    const [firstDocumentAt, lastDocumentAt] = await Promise.all([
      getDocumentDate(data, dataView, 'asc'),
      getDocumentDate(data, dataView, 'desc'),
    ]);

    if (firstDocumentAt && lastDocumentAt) {
      return {
        from: firstDocumentAt,
        to: lastDocumentAt,
      };
    }
  } catch (error) {
    //
  }

  return null;
};

const getDocumentDate = async (
  data: DataPublicPluginStart,
  dataView: DataView,
  sortOrder: 'asc' | 'desc'
): Promise<string | null> => {
  if (!dataView?.timeFieldName) {
    return null;
  }

  const result = await lastValueFrom(
    data.search.search({
      params: {
        index: dataView.title,
        body: {
          query: { match_all: {} },
          fields: [
            {
              field: dataView.timeFieldName,
              format: 'strict_date_optional_time',
            },
          ],
          size: 1,
          sort: { [dataView.timeFieldName]: sortOrder },
          _source: false,
        },
      },
    })
  );
  return result.rawResponse?.hits?.hits[0]?.fields?.[dataView.timeFieldName]?.[0] ?? null;
};
