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
import { Accessor, AccessorFn, GroupBy, GroupBySort, SmallMultiples } from '@elastic/charts';

interface ChartSplitterProps {
  splitColumnAccessor?: Accessor | AccessorFn;
  splitRowAccessor?: Accessor | AccessorFn;
  sort?: GroupBySort;
}

export const ChartSplitter = (props: ChartSplitterProps) => (
  <>
    <GroupBy
      id="__chart_splitter__"
      by={(spec, datum) => {
        const splitTypeAccessor = props.splitColumnAccessor || props.splitRowAccessor;
        if (splitTypeAccessor) {
          return typeof splitTypeAccessor === 'function'
            ? splitTypeAccessor(datum)
            : datum[splitTypeAccessor];
        }
        return spec.id;
      }}
      sort={props.sort || 'dataIndex'}
    />
    <SmallMultiples
      splitVertically={props.splitRowAccessor ? '__chart_splitter__' : undefined}
      splitHorizontally={props.splitColumnAccessor ? '__chart_splitter__' : undefined}
    />
  </>
);
