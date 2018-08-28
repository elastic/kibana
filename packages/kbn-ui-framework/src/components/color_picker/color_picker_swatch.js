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

import { KuiColorPickerEmptySwatch } from './color_picker_empty_swatch';

export function KuiColorPickerSwatch(props) {
  const { color, className } = props;
  const isClear = !color;
  const classes = classNames('kuiColorPicker__swatch', className, {
    'kuiColorPicker__emptySwatch': isClear,
  });
  let children;

  if (isClear) {
    children = <KuiColorPickerEmptySwatch />;
  }

  return (
    <div
      className={classes}
      aria-label={props['aria-label']}
      data-test-subj="colorSwatch"
      style={{ background: color ? color : '' }}
    >
      {children}
    </div>
  );
}

KuiColorPickerSwatch.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string,
};

