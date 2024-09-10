/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';

export const AddButtonExample = ({ dataViewId }: { dataViewId: string }) => {
  return (
    <>
      <EuiTitle>
        <h2>Add button example</h2>
      </EuiTitle>
      <EuiText>
        <p>
          Use the built in add button to add controls to a control group based on a hardcoded
          dataViewId and a simplified editor flyout
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <ControlGroupRenderer
          getCreationOptions={async (initialInput, builder) => {
            await builder.addDataControlFromField(initialInput, {
              dataViewId,
              title: 'Destintion',
              fieldName: 'geo.dest',
              grow: false,
              width: 'small',
            });
            await builder.addDataControlFromField(initialInput, {
              dataViewId,
              fieldName: 'geo.src',
              grow: false,
              title: 'Source',
              width: 'small',
            });
            return {
              initialInput: {
                ...initialInput,
                viewMode: ViewMode.EDIT,
                defaultControlGrow: false,
                defaultControlWidth: 'small',
              },
              settings: {
                showAddButton: true,
                staticDataViewId: dataViewId,
                editorConfig: {
                  hideAdditionalSettings: true,
                  hideDataViewSelector: true,
                  hideWidthSettings: true,
                },
              },
            };
          }}
        />
      </EuiPanel>
    </>
  );
};
