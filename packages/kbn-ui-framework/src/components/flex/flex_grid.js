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

const gutterSizeToClassNameMap = {
  none: '',
  small: 'kuiFlexGrid--gutterSmall',
  medium: 'kuiFlexGrid--gutterMedium',
  large: 'kuiFlexGrid--gutterLarge',
  extraLarge: 'kuiFlexGrid--gutterXLarge',
};

export const GUTTER_SIZES = Object.keys(gutterSizeToClassNameMap);

const columnsToClassNameMap = {
  0: 'kuiFlexGrid--wrap',
  2: 'kuiFlexGrid--halves',
  3: 'kuiFlexGrid--thirds',
  4: 'kuiFlexGrid--fourths',
};

export const COLUMNS = Object.keys(columnsToClassNameMap).map(columns => parseInt(columns, 10));

export const KuiFlexGrid = ({ children, className, gutterSize, columns, ...rest }) => {
  const classes = classNames(
    'kuiFlexGrid',
    gutterSizeToClassNameMap[gutterSize],
    columnsToClassNameMap[columns],
    className
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFlexGrid.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  gutterSize: PropTypes.oneOf(GUTTER_SIZES),
  columns: PropTypes.oneOf(COLUMNS).isRequired,
};

KuiFlexGrid.defaultProps = {
  gutterSize: 'large',
  columns: 0,
};

