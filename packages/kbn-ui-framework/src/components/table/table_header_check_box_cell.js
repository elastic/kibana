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

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { KuiTableHeaderCell } from './table_header_cell';

export const KuiTableHeaderCheckBoxCell = ({ onChange, isChecked, className, ...rest }) => {
  const classes = classNames('kuiTableHeaderCell--checkBox', className);
  return (
    <KuiTableHeaderCell className={classes} {...rest}>
      <input
        type="checkbox"
        className="kuiCheckBox"
        onChange={onChange}
        checked={isChecked}
        aria-label={`${isChecked ? 'Deselect' : 'Select'} all rows`}
      />
    </KuiTableHeaderCell>
  );
};
KuiTableHeaderCheckBoxCell.propTypes = {
  isChecked: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
};
