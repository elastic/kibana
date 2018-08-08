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
  small: 'kuiFlexGroup--gutterSmall',
  medium: 'kuiFlexGroup--gutterMedium',
  large: 'kuiFlexGroup--gutterLarge',
  extraLarge: 'kuiFlexGroup--gutterExtraLarge',
};

export const GUTTER_SIZES = Object.keys(gutterSizeToClassNameMap);

const alignItemsToClassNameMap = {
  stretch: '',
  flexStart: 'kuiFlexGroup--alignItemsStart',
  flexEnd: 'kuiFlexGroup--alignItemsEnd',
  center: 'kuiFlexGroup--alignItemsCenter',
};

export const ALIGN_ITEMS = Object.keys(alignItemsToClassNameMap);

const justifyContentToClassNameMap = {
  flexStart: '',
  flexEnd: 'kuiFlexGroup--justifyContentFlexEnd',
  center: 'kuiFlexGroup--justifyContentCenter',
  spaceBetween: 'kuiFlexGroup--justifyContentSpaceBetween',
  spaceAround: 'kuiFlexGroup--justifyContentSpaceAround',
  spaceEvenly: 'kuiFlexGroup--justifyContentSpaceEvenly',
};

export const JUSTIFY_CONTENTS = Object.keys(justifyContentToClassNameMap);

export const KuiFlexGroup = ({
  children,
  className,
  gutterSize,
  alignItems,
  justifyContent,
  wrap,
  ...rest
}) => {
  const classes = classNames(
    'kuiFlexGroup',
    gutterSizeToClassNameMap[gutterSize],
    alignItemsToClassNameMap[alignItems],
    justifyContentToClassNameMap[justifyContent],
    className,
    {
      'kuiFlexGroup--wrap': wrap,
    },
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

KuiFlexGroup.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  gutterSize: PropTypes.oneOf(GUTTER_SIZES),
  alignItems: PropTypes.oneOf(ALIGN_ITEMS),
  justifyContent: PropTypes.oneOf(JUSTIFY_CONTENTS),
  wrap: PropTypes.bool,
};

KuiFlexGroup.defaultProps = {
  gutterSize: 'large',
  alignItems: 'stretch',
  justifyContent: 'flexStart',
  wrap: false,
};
