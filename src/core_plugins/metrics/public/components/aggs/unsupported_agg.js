import AggRow from './agg_row';
import React from 'react';
export function UnsupportedAgg(props) {
  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <div className="vis_editor__row_item">
        <p>
          The <code>{props.model.type}</code> aggregation is no longer
          supported.
        </p>
      </div>
    </AggRow>
  );
}
