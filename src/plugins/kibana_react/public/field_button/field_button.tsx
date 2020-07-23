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
import classNames from 'classnames';
// import { EuiToken, EuiTokenProps, EuiKeyboardAccessible } from '@elastic/eui';
import './field_button.scss';

export interface FieldButtonProps extends Omit<EuiTokenProps, 'iconType'> {
  // label?: string;
  // scripted?: boolean;
  isOpen?: boolean;
  fieldIcon?: node;
  fieldName?: node;
  fieldInfoIcon?: node;
  fieldButton?: node;
}

export function FieldButton({
  // type,
  // label,
  // size = 's',
  // scripted,
  isOpen,
  fieldIcon,
  fieldName,
  fieldInfoIcon,
  fieldButton,
  className,
  ...rest
}: FieldButtonProps) {
  // const token = typeToEuiIconMap[type] || defaultIcon;

  const classes = classNames('kbnFieldButton', { 'kbnFieldButton-isOpen': isOpen }, className);

  return (
    // <>
    <div
      // {...token}
      className={classes}
      // aria-label={label || type}
      // title={label || type}
      // size={size as EuiTokenProps['size']}
      {...rest}
    >
      <div className="kbnFieldButton__fieldIcon">{fieldIcon}</div>
      <div className="kbnFieldButton__name">{fieldName}</div>
      <div className="kbnFieldButton__infoIcon">{fieldInfoIcon}</div>
    </div>
    // </>
  );
}
