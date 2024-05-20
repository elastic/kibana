/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent } from 'react';

import { EuiDraggable, EuiDroppable } from '@elastic/eui';

import { Agg } from './agg';
// @ts-ignore
import { handleAdd, handleDelete } from '../lib/collection_actions';
import { newMetricAggFn } from '../lib/new_metric_agg_fn';
import type { Panel, Series, SanitizedFieldType } from '../../../../common/types';
import type { TimeseriesUIRestrictions } from '../../../../common/ui_restrictions';

const DROPPABLE_ID = 'aggs_dnd';

export interface AggsProps {
  name: keyof Series;
  panel: Panel;
  model: Series;
  fields: Record<string, SanitizedFieldType[]>;
  uiRestrictions: TimeseriesUIRestrictions;
  onChange(part: Partial<Series>): void;
}

export class Aggs extends PureComponent<AggsProps> {
  render() {
    const { panel, model, fields, name, uiRestrictions, onChange } = this.props;
    const list = model.metrics;

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
                name={name}
                model={row}
                onAdd={() => handleAdd(this.props, newMetricAggFn)}
                onModelChange={onChange}
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
