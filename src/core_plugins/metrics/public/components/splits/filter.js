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

import createTextHandler from '../lib/create_text_handler';
import createSelectHandler from '../lib/create_select_handler';
import GroupBySelect from './group_by_select';
import PropTypes from 'prop-types';
import React from 'react';

export const SplitByFilter = props => {
  const { onChange } = props;
  const defaults = { filter: '' };
  const model = { ...defaults, ...props.model };
  const handleTextChange = createTextHandler(onChange);
  const handleSelectChange = createSelectHandler(onChange);
  return (
    <div className="vis_editor__split-container">
      <div className="vis_editor__label">Group By</div>
      <div className="vis_editor__split-selects">
        <GroupBySelect
          value={model.split_mode}
          onChange={handleSelectChange('split_mode')}
        />
      </div>
      <div className="vis_editor__label">Query String</div>
      <input
        className="vis_editor__split-filter"
        value={model.filter}
        onChange={handleTextChange('filter')}
      />
    </div>
  );
};

SplitByFilter.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func
};
