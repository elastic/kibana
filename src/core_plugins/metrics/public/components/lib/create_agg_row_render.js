import React from 'react';
import seriesChangeHandler from './series_change_handler';
import newMetricAggFn from './new_metric_agg_fn';
import { handleAdd, handleDelete } from './collection_actions';
import Agg from '../aggs/agg';

export default function createAggRowRender(props) {
  return (row, index, items) => {
    const { panel, model, fields } = props;
    const changeHandler = seriesChangeHandler(props, items);
    return (
      <Agg
        key={row.id}
        disableDelete={items.length < 2}
        fields={fields}
        model={row}
        onAdd={handleAdd.bind(null, props, newMetricAggFn)}
        onChange={changeHandler}
        onDelete={handleDelete.bind(null, props, row)}
        panel={panel}
        series={model}
        siblings={items}
        sortData={row.id} />
    );
  };
}
