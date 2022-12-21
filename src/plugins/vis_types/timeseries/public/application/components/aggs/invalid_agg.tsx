/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTitle, useEuiTheme } from '@elastic/eui';
import { AggRow } from './agg_row';
import type { Metric } from '../../../../common/types';
import { DragHandleProps } from '../../../types';
import { titleStyles } from '../../styles/common.styles';

interface InvalidAggProps {
  disableDelete: boolean;
  model: Metric;
  siblings: Metric[];
  dragHandleProps: DragHandleProps;
  onAdd: () => void;
  onDelete: () => void;
}

export const getInvalidAggComponent =
  (message: JSX.Element | string) => (props: InvalidAggProps) => {
    const { euiTheme } = useEuiTheme();
    return (
      <AggRow
        disableDelete={props.disableDelete}
        model={props.model}
        onAdd={props.onAdd}
        onDelete={props.onDelete}
        siblings={props.siblings}
        dragHandleProps={props.dragHandleProps}
      >
        <EuiTitle css={titleStyles(euiTheme)} size="xxxs" data-test-subj="invalid_agg">
          <span>{message}</span>
        </EuiTitle>
      </AggRow>
    );
  };
