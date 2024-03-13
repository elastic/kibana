/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiCallOut,
} from '@elastic/eui';
import { Services } from './types';
import { lastValueFrom } from 'rxjs';

export const buildEmbeddable = async (
  state: object, 
  buildApi: unknown,
  services: Services
) => {
  const api = buildApi(
    {
      serializeState: () => {
        return {
          rawState: {},
          references: []
        };
      }
    },
    // embeddable has no state so no comparitors are needed
    {}
  );

  const dataView = await services.dataViews.getDefaultDataView();

  async function search() {
    if (!dataView) {
      return;
    }
    const searchSource = await services.data.search.searchSource.create();
    searchSource.setField('index', dataView);
    searchSource.setField('size', 0);
    searchSource.setField('trackTotalHits', true);
    console.log('ES request', searchSource.getSearchRequestBody());
    // eslint-disable-next-line no-console
    const { rawResponse: resp } = await lastValueFrom(
      searchSource.fetch$({
        legacyHitsTotal: false,
      })
    );
    // eslint-disable-next-line no-console
    console.log('ES response', resp);
    return resp.hits.total?.value ?? 0;
  }

  return {
    api,
    Component: () => {
      const [count, setCount] = useState<number>(0);
      const [error, setError] = useState<Error | undefined>();
      
      useEffect(() => {
        let ignore = false;
        setError(undefined);
        search()
          .then((nextCount: number) => {
            if (ignore) {
              return;
            }
            setCount(nextCount);
          })
          .catch((err) => {
            if (ignore) {
              return;
            }
            setError(err);
          });
        return () => {
          ignore = true;
        };
      }, []);

      if (!dataView) {
        return (
          <EuiCallOut title="Default data view not found" color="warning" iconType="warning">
            <p>
              Please install sample data set to run the full example.
            </p>
          </EuiCallOut>
        );
      }

      if (error) {
        return (
          <EuiCallOut title="Search error" color="warning" iconType="warning">
            <p>
              {error.message}
            </p>
          </EuiCallOut>
        );
      }

      return (
        <p>
         Found <strong>{count}</strong> from {dataView.name} 
        </p>
      );
    },
  };
}