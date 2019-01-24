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
import _ from 'lodash';
import { EuiIcon } from '@elastic/eui';

export default props => (row) => {

  function tickFormatter(value) {
    if (_.isFunction(props.tickFormatter)) return props.tickFormatter(value);
    return value;
  }

  const formatter = row.tickFormatter || tickFormatter;
  const value = formatter(props.seriesValues[row.id]);
  const classes = ['tvbLegend__item'];
  const key = row.id;
  if (!_.includes(props.seriesFilter, row.id)) classes.push('disabled');
  if (row.label == null || row.legend === false) return (<div key={key} style={{ display: 'none' }}/>);
  return (
    <div
      key={key}
      className={classes.join(' ')}
      data-test-subj="tsvbLegendItem"
    >
      <button
        onClick={event => props.onToggle(event, row.id)}
        className="tvbLegend__button"
      >
        <div className="tvbLegend__itemLabel" title={`${row.label}: ${value}`}>
          <EuiIcon type="dot" color={row.color} />
          <span>{ row.label }</span>
        </div>
        <div className="tvbLegend__itemValue">{ value }</div>
      </button>
    </div>
  );
};
