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
import { EuiToolTip, EuiButtonIcon, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

function AggRowUi(props) {
  let iconType = 'eyeClosed';
  let iconColor = 'subdued';
  const last = _.last(props.siblings);
  const { intl } = props;

  if (last.id === props.model.id) {
    iconType = 'eye';
    iconColor = 'text';
  }

  let dragHandle;
  if (!props.disableDelete) {
    dragHandle = (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={(<FormattedMessage
            id="tsvb.aggRow.dragToSortTooltip"
            defaultMessage="Drag to sort"
          />)}
        >
          <EuiButtonIcon
            className="tvbAggRow__sortHandle"
            aria-label={intl.formatMessage({ id: 'tsvb.aggRow.dragToSortAriaLabel', defaultMessage: 'Drag to sort' })}
            iconType="grab"
          />
        </EuiToolTip>
      </EuiFlexItem>
    );
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
        {dragHandle}
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
};

const AggRow = injectI18n(AggRowUi);
export default AggRow;
