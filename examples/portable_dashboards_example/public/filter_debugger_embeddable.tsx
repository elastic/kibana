/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { DefaultEmbeddableApi, ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  PublishesUnifiedSearch,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { EuiCodeBlock, EuiPanel, EuiTitle } from '@elastic/eui';
import { FILTER_DEBUGGER_EMBEDDABLE_ID } from './constants';

export type Api = DefaultEmbeddableApi<{}>;

export const factory: ReactEmbeddableFactory<{}, {}, Api> = {
  type: FILTER_DEBUGGER_EMBEDDABLE_ID,
  deserializeState: () => {
    return {};
  },
  buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
    const api = buildApi(
      {
        serializeState: () => {
          return {
            rawState: {},
            references: [],
          };
        },
      },
      {}
    );

    return {
      api,
      Component: () => {
        const filters = useStateFromPublishingSubject(
          (parentApi as PublishesUnifiedSearch)?.filters$
        );

        return (
          <EuiPanel
            css={css`
              width: 100% !important;
              height: 100% !important;
            `}
            className="eui-yScrollWithShadows"
            hasShadow={false}
          >
            <EuiTitle>
              <h2>Filters</h2>
            </EuiTitle>
            <EuiCodeBlock language="JSON">{JSON.stringify(filters, undefined, 1)}</EuiCodeBlock>
          </EuiPanel>
        );
      },
    };
  },
};
