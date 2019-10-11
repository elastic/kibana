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

import { EuiFormRow, EuiToolTip, EuiIcon } from '@elastic/eui';

export function FormRow(props) {
  let control = props.children;
  if (props.disableMsg) {
    control = (
      <EuiToolTip placement="top" content={props.disableMsg} anchorClassName="eui-displayBlock">
        {control}
      </EuiToolTip>
    );
  }

  const label = props.warningMsg ? (
    <>
      <EuiToolTip position="top" content={props.warningMsg}>
        <EuiIcon type="alert" />
      </EuiToolTip>
      {props.label}
    </>
  ) : (
    props.label
  );

  return (
    <EuiFormRow label={label} id={props.id} data-test-subj={'inputControl' + props.controlIndex}>
      {control}
    </EuiFormRow>
  );
}

FormRow.propTypes = {
  label: PropTypes.string.isRequired,
  warningMsg: PropTypes.string,
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  controlIndex: PropTypes.number.isRequired,
  disableMsg: PropTypes.string,
};
