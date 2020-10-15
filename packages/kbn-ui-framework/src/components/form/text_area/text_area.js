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
  small: 'kuiTextArea--small',
  medium: undefined,
  large: 'kuiTextArea--large',
};

export const TEXTAREA_SIZE = Object.keys(sizeToClassNameMap);

export const KuiTextArea = ({
  className,
  onChange,
  isInvalid,
  isNonResizable,
  isDisabled,
  size,
  ...rest
}) => {
  const classes = classNames(
    'kuiTextArea',
    className,
    {
      'kuiTextArea-isInvalid': isInvalid,
      'kuiTextArea--nonResizable': isNonResizable,
    },
    sizeToClassNameMap[size]
  );

  return <textarea className={classes} onChange={onChange} disabled={isDisabled} {...rest} />;
};

KuiTextArea.defaultProps = {
  isInvalid: false,
  isNonResizable: false,
  isDisabled: false,
  size: 'medium',
};

KuiTextArea.propTypes = {
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  isInvalid: PropTypes.bool,
  isNonResizable: PropTypes.bool,
  isDisabled: PropTypes.bool,
  size: PropTypes.oneOf(TEXTAREA_SIZE),
};
