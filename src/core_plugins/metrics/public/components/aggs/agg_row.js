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

import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import AddDeleteButtons from '../add_delete_buttons';
import { EuiToolTip } from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

function AggRowUi(props) {
  let iconClassName = 'fa fa-eye-slash';
  let iconRowClassName = 'vis_editor__agg_row-icon';
  const last = _.last(props.siblings);
  const { intl } = props;

  if (last.id === props.model.id) {
    iconClassName = 'fa fa-eye';
    iconRowClassName += ' last';
  }

  let dragHandle;
  if (!props.disableDelete) {
    dragHandle = (
      <div>
        <EuiToolTip
          content={
            <FormattedMessage
              id="metrics.aggRow.sortTooltip"
              defaultMessage="Sort"
            />
          }
        >
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
          addTooltip={intl.formatMessage({ id: 'metrics.aggRow.addMetricButtonTooltip', defaultMessage: 'Add Metric' })}
          deleteTooltip={intl.formatMessage({ id: 'metrics.aggRow.deleteMetricButtonTooltip', defaultMessage: 'Delete Metric' })}
          onAdd={props.onAdd}
          onDelete={props.onDelete}
          disableDelete={props.disableDelete}
        />
      </div>
    </div>
  );
}

AggRowUi.propTypes = {
  disableDelete: PropTypes.bool,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func,
  siblings: PropTypes.array,
};

const AggRow = injectI18n(AggRowUi);
export default AggRow;
