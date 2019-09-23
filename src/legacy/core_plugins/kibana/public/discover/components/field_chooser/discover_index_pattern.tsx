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
import React, { useState } from 'react';
import { EuiComboBox, EuiToolTip } from '@elastic/eui';
import { SavedObject } from 'kibana/server';

interface Props {
  indexPatternList: SavedObject[];
  selectedIndexPattern: SavedObject;
  setIndexPattern: (id: string) => void;
}
export function DiscoverIndexPattern({
  indexPatternList,
  selectedIndexPattern,
  setIndexPattern,
}: Props) {
  if (indexPatternList.length === 0 || !selectedIndexPattern) {
    return null;
  } else if (indexPatternList.length === 1) {
    return (
      <div className="index-pattern">
        <h2 className="index-pattern-label" id="index_pattern_id" tabIndex={0}>
          {selectedIndexPattern.attributes.title}
        </h2>
      </div>
    );
  }
  const [selected, setSelected] = useState(selectedIndexPattern);

  const options = indexPatternList.map(ip => ({
    value: ip.id,
    label: ip.attributes.title,
  }));

  return (
    <EuiToolTip content={selectedIndexPattern.attributes.title}>
      <EuiComboBox
        className="index-pattern-selection"
        compressed={true}
        isClearable={false}
        onChange={choices => {
          const newSelected = choices[0] && indexPatternList.find(ip => ip.id === choices[0].value);
          if (newSelected) {
            setSelected(newSelected);
            setIndexPattern!(newSelected.id);
          }
        }}
        options={options}
        selectedOptions={selected ? [{ value: selected.id, label: selected.attributes.title }] : []}
        singleSelection={{ asPlainText: true }}
      />
    </EuiToolTip>
  );
}
