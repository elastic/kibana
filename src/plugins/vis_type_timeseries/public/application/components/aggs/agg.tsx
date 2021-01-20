/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { HTMLAttributes } from 'react';
// @ts-ignore
import { aggToComponent } from '../lib/agg_to_component';
// @ts-ignore
import { isMetricEnabled } from '../../lib/check_ui_restrictions';
import { UnsupportedAgg } from './unsupported_agg';
import { TemporaryUnsupportedAgg } from './temporary_unsupported_agg';
import { MetricsItemsSchema, PanelSchema, SeriesItemsSchema } from '../../../../common/types';
import { DragHandleProps } from '../../../types';
import { TimeseriesUIRestrictions } from '../../../../common/ui_restrictions';
import { IFieldType } from '../../../../../data/common/index_patterns/fields';

interface AggProps extends HTMLAttributes<HTMLElement> {
  disableDelete: boolean;
  fields: IFieldType[];
  model: MetricsItemsSchema;
  panel: PanelSchema;
  series: SeriesItemsSchema;
  siblings: MetricsItemsSchema[];
  uiRestrictions: TimeseriesUIRestrictions;
  dragHandleProps: DragHandleProps;
  onAdd: () => void;
  onChange: () => void;
  onDelete: () => void;
}

export function Agg(props: AggProps) {
  const { model, uiRestrictions } = props;

  let Component = aggToComponent[model.type];

  if (!Component) {
    Component = UnsupportedAgg;
  } else if (!isMetricEnabled(model.type, uiRestrictions)) {
    Component = TemporaryUnsupportedAgg;
  }

  const style = {
    cursor: 'default',
    ...props.style,
  };

  const indexPattern =
    (props.series.override_index_pattern && props.series.series_index_pattern) ||
    props.panel.index_pattern;

  return (
    <div className={props.className} style={style}>
      <Component
        fields={props.fields}
        disableDelete={props.disableDelete}
        model={props.model}
        onAdd={props.onAdd}
        onChange={props.onChange}
        onDelete={props.onDelete}
        panel={props.panel}
        series={props.series}
        siblings={props.siblings}
        indexPattern={indexPattern}
        uiRestrictions={props.uiRestrictions}
        dragHandleProps={props.dragHandleProps}
      />
    </div>
  );
}
