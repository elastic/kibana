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
import classNames from 'classnames';

export function KuiToolBarSearchBox({
  defaultValue,
  filter,
  onFilter,
  placeholder,
  className,
  ...rest
}) {
  function onChange(event) {
    onFilter(event.target.value);
  }
  const classes = classNames('kuiToolBarSearch', className);
  return (
    <div className={classes} {...rest}>
      <div className="kuiToolBarSearchBox">
        <div className="kuiToolBarSearchBox__icon kuiIcon fa-search" />
        <input
          defaultValue={defaultValue}
          className="kuiToolBarSearchBox__input"
          type="text"
          placeholder={placeholder}
          aria-label="Filter"
          value={filter}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

KuiToolBarSearchBox.propTypes = {
  defaultValue: PropTypes.string,
  filter: PropTypes.string,
  onFilter: PropTypes.func.isRequired,
};

KuiToolBarSearchBox.defaultProps = {
  placeholder: 'Search...',
};
