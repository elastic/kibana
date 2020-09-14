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
import React, { useContext } from 'react';
import { EuiCheckbox } from '@elastic/eui';
import { GridContext, DiscoverGridContext } from './discover_grid_context';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';

export const DiscoverGridSelectButton = ({
  col,
  rows,
}: {
  col: any;
  rows?: ElasticSearchHit[];
}) => {
  const { selected, setSelected } = useContext<GridContext>(DiscoverGridContext);
  const rowIndex = col.rowIndex;
  const isChecked = selected.includes(rowIndex);
  if (!rows) {
    return null;
  }

  return (
    <EuiCheckbox
      id={`${rowIndex}`}
      aria-label={`Select row ${rowIndex}, ${rows[rowIndex]._id}`}
      checked={isChecked}
      onChange={(e) => {
        if (e.target.checked) {
          setSelected([...selected, rowIndex]);
        } else {
          setSelected(selected.filter((idx: number) => idx !== rowIndex));
        }
      }}
    />
  );
};
