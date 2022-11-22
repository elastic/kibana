/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  LazyControlGroupRenderer,
  ControlGroupContainer,
  ControlGroupInput,
} from '@kbn/controls-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiPanel } from '@elastic/eui';
import { getDefaultControlGroupInput } from '@kbn/controls-plugin/common';

interface Props {
  dataView: DataView;
}
const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

export const ControlGroupExample = ({ dataView }: Props) => {
  const [myControlGroup, setControlGroup] = useState<ControlGroupContainer>();

  return (
    <EuiPanel hasBorder={true}>
      <ControlGroupRenderer
        onEmbeddableLoad={async (controlGroup) => {
          setControlGroup(controlGroup);
        }}
        getCreationOptions={async (controlGroupInputBuilder) => {
          const initialInput: Partial<ControlGroupInput> = getDefaultControlGroupInput();
          await controlGroupInputBuilder.addDataControlFromField(initialInput, {
            dataViewId: dataView.id ?? 'kibana_sample_data_ecommerce',
            fieldName: 'customer_first_name.keyword',
          });
          await controlGroupInputBuilder.addDataControlFromField(initialInput, {
            dataViewId: dataView.id ?? 'kibana_sample_data_ecommerce',
            fieldName: 'customer_last_name.keyword',
          });
          return initialInput;
        }}
      />
    </EuiPanel>
  );
};
