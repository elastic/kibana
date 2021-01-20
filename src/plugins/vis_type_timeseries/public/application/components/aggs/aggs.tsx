/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { PureComponent } from 'react';

import { EuiDraggable, EuiDroppable } from '@elastic/eui';

import { Agg } from './agg';
// @ts-ignore
import { seriesChangeHandler } from '../lib/series_change_handler';
// @ts-ignore
import { handleAdd, handleDelete } from '../lib/collection_actions';
import { newMetricAggFn } from '../lib/new_metric_agg_fn';
import { PanelSchema, SeriesItemsSchema } from '../../../../common/types';
import { TimeseriesUIRestrictions } from '../../../../common/ui_restrictions';
import { IFieldType } from '../../../../../data/common/index_patterns/fields';

const DROPPABLE_ID = 'aggs_dnd';

export interface AggsProps {
  panel: PanelSchema;
  model: SeriesItemsSchema;
  fields: IFieldType[];
  uiRestrictions: TimeseriesUIRestrictions;
}

export class Aggs extends PureComponent<AggsProps> {
  render() {
    const { panel, model, fields, uiRestrictions } = this.props;
    const list = model.metrics;

    const onChange = seriesChangeHandler(this.props, list);

    return (
      <EuiDroppable droppableId={`${DROPPABLE_ID}:${model.id}`} type="MICRO" spacing="s">
        {list.map((row, idx) => (
          <EuiDraggable
            spacing="s"
            key={row.id}
            index={idx}
            customDragHandle={true}
            draggableId={`${DROPPABLE_ID}:${model.id}:${row.id}`}
          >
            {(provided) => (
              <Agg
                key={row.id}
                disableDelete={list.length < 2}
                fields={fields}
                model={row}
                onAdd={() => handleAdd(this.props, newMetricAggFn)}
                onChange={onChange}
                onDelete={() => handleDelete(this.props, row)}
                panel={panel}
                series={model}
                siblings={list}
                uiRestrictions={uiRestrictions}
                dragHandleProps={provided.dragHandleProps}
              />
            )}
          </EuiDraggable>
        ))}
      </EuiDroppable>
    );
  }
}
