import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import AddDeleteButtons from '../add_delete_buttons';
import { EuiToolTip } from '@elastic/eui';

function AggRow(props) {
  let iconClassName = 'fa fa-eye-slash';
  let iconRowClassName = 'vis_editor__agg_row-icon';
  const last = _.last(props.siblings);
  if (last.id === props.model.id) {
    iconClassName = 'fa fa-eye';
    iconRowClassName += ' last';
  }

  let dragHandle;
  if (!props.disableDelete) {
    dragHandle = (
      <div>
        <EuiToolTip content="Sort">
          <div className="vis_editor__agg_sort thor__button-outlined-default sm">
            <i className="fa fa-sort" />
          </div>
        </EuiToolTip>
      </div>
    );
  }

  return (
    <div className="vis_editor__agg_row">
      <div className="vis_editor__agg_row-item" data-test-subj="aggRow">
        <div className={iconRowClassName}>
          <i className={iconClassName} />
        </div>
        {props.children}
        { dragHandle }
        <AddDeleteButtons
          testSubj="addMetric"
          addTooltip="Add Metric"
          deleteTooltip="Delete Metric"
          onAdd={props.onAdd}
          onDelete={props.onDelete}
          disableDelete={props.disableDelete}
        />
      </div>
    </div>
  );
}

AggRow.propTypes = {
  disableDelete: PropTypes.bool,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func,
  siblings: PropTypes.array,
};

export default AggRow;
