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

const sizeToClassNameMap = {
  small: 'kuiTextInput--small',
  medium: undefined,
  large: 'kuiTextInput--large',
};

export const TEXTINPUT_SIZE = Object.keys(sizeToClassNameMap);

export const KuiTextInput = ({ className, onChange, isInvalid, isDisabled, size, ...rest }) => {
  const classes = classNames(
    'kuiTextInput',
    className,
    {
      'kuiTextInput-isInvalid': isInvalid,
    },
    sizeToClassNameMap[size]
  );

  return (
    <input type="text" className={classes} onChange={onChange} disabled={isDisabled} {...rest} />
  );
};

KuiTextInput.defaultProps = {
  isInvalid: false,
  isDisabled: false,
  size: 'medium',
};

KuiTextInput.propTypes = {
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  isInvalid: PropTypes.bool,
  isDisabled: PropTypes.bool,
  size: PropTypes.oneOf(TEXTINPUT_SIZE),
};
