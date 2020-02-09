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

import { LEFT_ALIGNMENT, RIGHT_ALIGNMENT } from '../../services';
export const ALIGNMENT = [RIGHT_ALIGNMENT, LEFT_ALIGNMENT];

export const KuiTableRowCell = ({ children, align, className, textOnly, ...rest }) => {
  const classes = classNames('kuiTableRowCell', className, {
    'kuiTableRowCell--alignRight': align === RIGHT_ALIGNMENT,
    // We're doing this rigamarole instead of creating kuiTabelRowCell--textOnly for BWC
    // purposes for the time-being.
    'kuiTableRowCell--overflowingContent': !textOnly,
  });

  return (
    <td className={classes} {...rest}>
      <div className="kuiTableRowCell__liner">{children}</div>
    </td>
  );
};

KuiTableRowCell.propTypes = {
  align: PropTypes.oneOf(ALIGNMENT),
  children: PropTypes.node,
  className: PropTypes.string,
  textOnly: PropTypes.bool,
};

KuiTableRowCell.defaultProps = {
  align: LEFT_ALIGNMENT,
  textOnly: true,
};
