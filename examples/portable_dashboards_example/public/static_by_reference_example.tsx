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

import { buildPhraseFilter, Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DashboardRenderer, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { EuiCode, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';

export const StaticByReferenceExample = ({
  dashboardId,
  dataView,
}: {
  dashboardId?: string;
  dataView: DataView;
}) => {
  return dashboardId ? (
    <>
      <EuiTitle>
        <h2>Static, by reference example</h2>
      </EuiTitle>
      <EuiText>
        <p>
          Loads a static, non-editable version of the <EuiCode>[Logs] Web Traffic</EuiCode>{' '}
          dashboard, excluding any logs with an operating system of <EuiCode>win xip</EuiCode>.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel
        className="eui-scrollBar"
        hasBorder={true}
        // By specifying the height + overflow of the EuiPanel, we make it so that the dashboard height is
        // constrained to the container - so, the dashboard is rendered with a vertical scrollbar
        css={css`
          height: 600px;
          overflow-y: auto;
        `}
      >
        <DashboardRenderer
          savedObjectId={dashboardId}
          getCreationOptions={async () => {
            const field = dataView.getFieldByName('machine.os.keyword');
            let filter: Filter;
            let creationOptions: DashboardCreationOptions = {
              getInitialInput: () => ({ viewMode: ViewMode.VIEW }),
            };
            if (field) {
              filter = buildPhraseFilter(field, 'win xp', dataView);
              filter.meta.negate = true;
              creationOptions = {
                ...creationOptions,
                getInitialInput: () => ({ filters: [filter] }),
              };
            }
            return creationOptions; // if can't find the field, then just return no special creation options
          }}
        />
      </EuiPanel>
    </>
  ) : (
    <div>Ensure that the web logs sample dashboard is loaded to view this example.</div>
  );
};
