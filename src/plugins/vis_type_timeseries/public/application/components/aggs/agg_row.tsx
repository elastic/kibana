/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { last } from 'lodash';
import { EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AddDeleteButtons } from '../add_delete_buttons';
import { SeriesDragHandler } from '../series_drag_handler';
import { MetricsItemsSchema } from '../../../../common/types';
import { DragHandleProps } from '../../../types';

interface AggRowProps {
  disableDelete: boolean;
  model: MetricsItemsSchema;
  siblings: MetricsItemsSchema[];
  dragHandleProps: DragHandleProps;
  children: React.ReactNode;
  onAdd: () => void;
  onDelete: () => void;
}

export function AggRow(props: AggRowProps) {
  let iconType = 'eyeClosed';
  let iconColor = 'subdued';
  const lastSibling = last(props.siblings) as MetricsItemsSchema;

  if (lastSibling.id === props.model.id) {
    iconType = 'eye';
    iconColor = 'text';
  }

  return (
    <div className="tvbAggRow">
      <EuiFlexGroup
        data-test-subj="aggRow"
        gutterSize="s"
        alignItems="flexStart"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon className="tvbAggRow__visibilityIcon" type={iconType} color={iconColor} />
        </EuiFlexItem>
        <EuiFlexItem className="tvbAggRow__children">{props.children}</EuiFlexItem>

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
