/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
