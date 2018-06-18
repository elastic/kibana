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
import { EuiToolTip } from '@elastic/eui';

function AddDeleteButtons(props) {
  const { testSubj } = props;
  const createDelete = () => {
    if (props.disableDelete) {
      return null;
    }
    return (
      <EuiToolTip content={props.deleteTooltip}>
        <button
          data-test-subj={`${testSubj}DeleteBtn`}
          aria-label={props.deleteTooltip}
          className="thor__button-outlined-danger thor__button-delete sm"
          onClick={props.onDelete}
        >
          <i className="fa fa-trash-o" />
        </button>
      </EuiToolTip>
    );
  };
  const createAdd = () => {
    if (props.disableAdd) {
      return null;
    }
    return (
      <EuiToolTip content={props.addTooltip}>
        <button
          data-test-subj={`${testSubj}AddBtn`}
          aria-label={props.addTooltip}
          className="thor__button-outlined-default sm thor__button-add"
          onClick={props.onAdd}
        >
          <i className="fa fa-plus" />
        </button>
      </EuiToolTip>
    );
  };
  const deleteBtn = createDelete();
  const addBtn = createAdd();
  let clone;
  if (props.onClone && !props.disableAdd) {
    clone = (
      <EuiToolTip content={props.cloneTooltip}>
        <button
          data-test-subj={`${testSubj}CloneBtn`}
          aria-label={props.cloneTooltip}
          className="thor__button-outlined-default thor__button-clone sm"
          onClick={props.onClone}
        >
          <i className="fa fa-files-o" />
        </button>
      </EuiToolTip>
    );
  }
  return (
    <div className="add_delete__buttons">
      { clone }
      { addBtn }
      { deleteBtn }
    </div>
  );
}

AddDeleteButtons.defaultProps = {
  testSubj: 'Add',
  addTooltip: 'Add',
  deleteTooltip: 'Delete',
  cloneTooltip: 'Clone'
};

AddDeleteButtons.propTypes = {
  addTooltip: PropTypes.string,
  deleteTooltip: PropTypes.string,
  cloneTooltip: PropTypes.string,
  disableAdd: PropTypes.bool,
  disableDelete: PropTypes.bool,
  onClone: PropTypes.func,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func
};

export default AddDeleteButtons;
