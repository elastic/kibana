/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { last } from 'lodash';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AddDeleteButtons } from '../add_delete_buttons';
import { SeriesDragHandler } from '../series_drag_handler';
import { tsvbEditorRowStyles, aggRowChildrenStyles } from '../../styles/common.styles';
import type { Metric } from '../../../../common/types';
import { DragHandleProps } from '../../../types';

interface AggRowProps {
  disableDelete: boolean;
  model: Metric;
  siblings: Metric[];
  dragHandleProps: DragHandleProps;
  children: React.ReactNode;
  onAdd: () => void;
  onDelete: () => void;
}

export function AggRow(props: AggRowProps) {
  let iconType = 'eyeClosed';
  let iconColor = 'subdued';
  const lastSibling = last(props.siblings) as Metric;

  const { euiTheme } = useEuiTheme();

  if (lastSibling.id === props.model.id) {
    iconType = 'eye';
    iconColor = 'text';
  }

  return (
    <div css={tsvbEditorRowStyles(euiTheme)}>
      <EuiFlexGroup
        data-test-subj="aggRow"
        gutterSize="s"
        alignItems="flexStart"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} color={iconColor} style={{ marginTop: euiTheme.size.xs }} />
        </EuiFlexItem>
        <EuiFlexItem css={aggRowChildrenStyles(euiTheme)}>{props.children}</EuiFlexItem>

        <SeriesDragHandler
          dragHandleProps={props.dragHandleProps}
          hideDragHandler={props.disableDelete}
        />

        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            testSubj="addMetric"
            addTooltip={i18n.translate('visTypeTimeseries.aggRow.addMetricButtonTooltip', {
              defaultMessage: 'Add Metric',
            })}
            deleteTooltip={i18n.translate('visTypeTimeseries.aggRow.deleteMetricButtonTooltip', {
              defaultMessage: 'Delete Metric',
            })}
            onAdd={props.onAdd}
            onDelete={props.onDelete}
            disableDelete={props.disableDelete}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
