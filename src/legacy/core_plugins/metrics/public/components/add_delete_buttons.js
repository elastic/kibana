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
import { EuiToolTip, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

function AddDeleteButtons(props) {
  const { testSubj } = props;
  const createDelete = () => {
    if (props.disableDelete) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={props.deleteTooltip}>
          <EuiButtonIcon
            data-test-subj={`${testSubj}DeleteBtn`}
            aria-label={props.deleteTooltip}
            color="danger"
            iconType="trash"
            onClick={props.onDelete}
          />
        </EuiToolTip>
      </EuiFlexItem>
    );
  };
  const createAdd = () => {
    if (props.disableAdd) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={props.addTooltip}>
          <EuiButtonIcon
            data-test-subj={`${testSubj}AddBtn`}
            aria-label={props.addTooltip}
            iconType="plusInCircle"
            onClick={props.onAdd}
          />
        </EuiToolTip>
      </EuiFlexItem>
    );
  };
  const deleteBtn = createDelete();
  const addBtn = createAdd();
  let clone;
  if (props.onClone && !props.disableAdd) {
    clone = (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={props.cloneTooltip}>
          <EuiButtonIcon
            data-test-subj={`${testSubj}CloneBtn`}
            aria-label={props.cloneTooltip}
            iconType="copy"
            onClick={props.onClone}
          />
        </EuiToolTip>
      </EuiFlexItem>
    );
  }
  return (
    <EuiFlexGroup gutterSize="s" responsive={props.responsive} justifyContent="flexEnd">
      { clone }
      { addBtn }
      { deleteBtn }
    </EuiFlexGroup>
  );
}

AddDeleteButtons.defaultProps = {
  testSubj: 'Add',
  addTooltip: i18n.translate('tsvb.addDeleteButtons.addButtonDefaultTooltip', { defaultMessage: 'Add' }),
  deleteTooltip: i18n.translate('tsvb.addDeleteButtons.deleteButtonDefaultTooltip', { defaultMessage: 'Delete' }),
  cloneTooltip: i18n.translate('tsvb.addDeleteButtons.cloneButtonDefaultTooltip', { defaultMessage: 'Clone' })
};

AddDeleteButtons.propTypes = {
  addTooltip: PropTypes.string,
  deleteTooltip: PropTypes.string,
  cloneTooltip: PropTypes.string,
  disableAdd: PropTypes.bool,
  disableDelete: PropTypes.bool,
  onClone: PropTypes.func,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func,
  responsive: PropTypes.bool,
};

export default AddDeleteButtons;
