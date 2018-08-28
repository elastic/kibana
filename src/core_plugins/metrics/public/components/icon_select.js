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
import {
  EuiComboBox,
} from '@elastic/eui';

function renderOption(option) {
  const icon = option.value;
  const label = option.label;
  return (
    <div className="Select-value">
      <span
        className="Select-value-label"
        aria-label={`${label} icon`}
      >
        <span className={`vis_editor__icon_select-value kuiIcon ${icon}`} />
        { label }
      </span>
    </div>
  );
}

function IconSelect(props) {
  const selectedIcon = props.icons.find(option => {
    return props.value === option.value;
  });
  return (
    <EuiComboBox
      isClearable={false}
      id={props.id}
      options={props.icons}
      selectedOptions={selectedIcon ? [selectedIcon] : []}
      onChange={props.onChange}
      singleSelection={true}
      renderOption={renderOption}
    />
  );
}

IconSelect.defaultProps = {
  icons: [
    { value: 'fa-asterisk', label: 'Asterisk' },
    { value: 'fa-bell', label: 'Bell' },
    { value: 'fa-bolt', label: 'Bolt' },
    { value: 'fa-bomb', label: 'Bomb' },
    { value: 'fa-bug', label: 'Bug' },
    { value: 'fa-comment', label: 'Comment' },
    { value: 'fa-exclamation-circle', label: 'Exclamation Circle' },
    { value: 'fa-exclamation-triangle', label: 'Exclamation Triangle' },
    { value: 'fa-fire', label: 'Fire' },
    { value: 'fa-flag', label: 'Flag' },
    { value: 'fa-heart', label: 'Heart' },
    { value: 'fa-map-marker', label: 'Map Marker' },
    { value: 'fa-map-pin', label: 'Map Pin' },
    { value: 'fa-star', label: 'Star' },
    { value: 'fa-tag', label: 'Tag' },
  ]
};

IconSelect.propTypes = {
  icons: PropTypes.array,
  id: PropTypes.string,
  onChange: PropTypes.func,
  value: PropTypes.string.isRequired
};

export default IconSelect;
