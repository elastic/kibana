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
import { cloneElement } from 'react';
import classNames from 'classnames';

const sizeToClassNameMap = {
  small: 'kuiTitle--small',
  large: 'kuiTitle--large',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiTitle = ({ size, children, className, ...rest }) => {
  const classes = classNames('kuiTitle', sizeToClassNameMap[size], className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiTitle.propTypes = {
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(SIZES),
};

export const KuiText = ({ children, className, ...rest }) => {
  const classes = classNames('kuiText', className);

  const props = {
    className: classes,
    ...rest,
  };

  return cloneElement(children, props);
};

KuiText.propTypes = {
  children: PropTypes.node.isRequired,
};
