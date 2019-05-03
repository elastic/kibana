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
import { last } from 'lodash';
import AddDeleteButtons from '../add_delete_buttons';
import { EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import { SeriesDragHandler } from '../series_drag_handler';

function AggRowUi(props) {
  let iconType = 'eyeClosed';
  let iconColor = 'subdued';
  const lastSibling = last(props.siblings);
  const { intl } = props;

  if (lastSibling.id === props.model.id) {
    iconType = 'eye';
    iconColor = 'text';
  }

  return (
    <div className="tvbAggRow">
      <EuiFlexGroup data-test-subj="aggRow" gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon className="tvbAggRow__visibilityIcon" type={iconType} color={iconColor} />
        </EuiFlexItem>
        <EuiFlexItem className="tvbAggRow__children">
          {props.children}
        </EuiFlexItem>

        <SeriesDragHandler dragHandleProps={props.dragHandleProps} hideDragHandler={props.disableDelete} />

        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            testSubj="addMetric"
            addTooltip={intl.formatMessage({ id: 'tsvb.aggRow.addMetricButtonTooltip', defaultMessage: 'Add Metric' })}
            deleteTooltip={intl.formatMessage({ id: 'tsvb.aggRow.deleteMetricButtonTooltip', defaultMessage: 'Delete Metric' })}
            onAdd={props.onAdd}
            onDelete={props.onDelete}
            disableDelete={props.disableDelete}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

AggRowUi.propTypes = {
  disableDelete: PropTypes.bool,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func,
  siblings: PropTypes.array,
  dragHandleProps: PropTypes.object,
};

const AggRow = injectI18n(AggRowUi);
export default AggRow;
