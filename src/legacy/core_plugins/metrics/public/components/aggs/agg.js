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
import aggToComponent from '../lib/agg_to_component';
import { UnsupportedAgg } from './unsupported_agg';
import { TemporaryUnsupportedAgg } from './temporary_unsupported_agg';

import { isMetricEnabled } from '../../lib/check_ui_restrictions';

function Agg(props) {
  const { model, uiRestrictions } = props;

  let Component = aggToComponent[model.type];

  if (!Component) {
    Component = UnsupportedAgg;
  } else if (!isMetricEnabled(model.type, uiRestrictions)) {
    Component = TemporaryUnsupportedAgg;
  }

  const style = {
    cursor: 'default',
    ...props.style,
  };

  return (
    <div
      className={props.className}
      style={style}
    >
      <Component
        fields={props.fields}
        disableDelete={props.disableDelete}
        model={props.model}
        onAdd={props.onAdd}
        onChange={props.onChange}
        onDelete={props.onDelete}
        panel={props.panel}
        series={props.series}
        siblings={props.siblings}
        uiRestrictions={props.uiRestrictions}
        dragHandleProps={props.dragHandleProps}
      />
    </div>
  );
}

Agg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
  uiRestrictions: PropTypes.object,
  dragHandleProps: PropTypes.object,
};

export default Agg;
