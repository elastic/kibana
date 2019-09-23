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
import { EuiComboBox, EuiToolTip, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
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
    // just in case, shouldn't happen
    return null;
  } else if (indexPatternList.length === 1) {
    return (
      <div className="index-pattern">
        <h2 className="index-pattern-label">{selectedIndexPattern.attributes.title}</h2>
      </div>
    );
  }
  const [selected, setSelected] = useState(selectedIndexPattern);

  const options = indexPatternList.map(entity => ({
    value: entity.id,
    label: entity.attributes.title,
  }));

  return (
    <EuiFlexGroup gutterSize="none" direction="column" responsive={false}>
      <EuiFlexItem>
        <EuiToolTip content={selected.attributes.title}>
          <EuiComboBox
            className="index-pattern-selection"
            data-test-subj="index-pattern-selection"
            fullWidth={true}
            isClearable={false}
            onChange={choices => {
              const newSelected =
                choices[0] && indexPatternList.find(entity => entity.id === choices[0].value);
              if (newSelected) {
                setSelected(newSelected);
                setIndexPattern!(newSelected.id);
              }
            }}
            options={options}
            selectedOptions={
              selected ? [{ value: selected.id, label: selected.attributes.title }] : []
            }
            singleSelection={{ asPlainText: true }}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
