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
import { EuiComboBox } from '@elastic/eui';
import { SavedObject } from 'kibana/server';
import { DiscoverIndexPatternTitle } from './discover_index_pattern_title';

export interface DiscoverIndexPatternProps {
  /**
   * list of available index patterns, if length > 1, component offers a "change" link
   */
  indexPatternList: SavedObject[];
  /**
   * currently selected index pattern, due to angular issues it's undefined at first rendering
   */
  selectedIndexPattern: SavedObject;
  /**
   * triggered when user selects a new index pattern
   */
  setIndexPattern: (id: string) => void;
}

/**
 * Component allows you to select an index pattern in discovers side bar
 */
export function DiscoverIndexPattern({
  indexPatternList,
  selectedIndexPattern,
  setIndexPattern,
}: DiscoverIndexPatternProps) {
  if (!indexPatternList || indexPatternList.length === 0 || !selectedIndexPattern) {
    // just in case, shouldn't happen
    return null;
  }
  const [selected, setSelected] = useState(selectedIndexPattern);
  const [showCombo, setShowCombo] = useState(false);
  const options = indexPatternList.map(entity => ({
    value: entity.id,
    label: entity.attributes!.title,
  }));
  const selectedOptions = selected
    ? [{ value: selected.id, label: selected.attributes.title }]
    : [];

  const findIndexPattern = (id?: string) => indexPatternList.find(entity => entity.id === id);

  if (!showCombo) {
    return (
      <DiscoverIndexPatternTitle
        isChangeable={indexPatternList.length > 1}
        onChange={() => setShowCombo(true)}
        title={selected.attributes ? selected.attributes.title : ''}
      />
    );
  }

  /**
   * catches a EuiComboBox related 'Can't perform a React state update on an unmounted component'
   * warning in console by delaying the hiding/removal of the EuiComboBox a bit
   */
  function hideCombo() {
    setTimeout(() => setShowCombo(false), 50);
  }

  return (
    <EuiComboBox
      className="index-pattern-selection"
      data-test-subj="index-pattern-selection"
      fullWidth={true}
      isClearable={false}
      onBlur={() => hideCombo()}
      onChange={choices => {
        const newSelected = choices[0] && findIndexPattern(choices[0].value);
        if (newSelected) {
          setSelected(newSelected);
          setIndexPattern(newSelected.id);
        }
        hideCombo();
      }}
      inputRef={el => {
        // auto focus input element when combo box is displayed
        if (el) {
          el.focus();
        }
      }}
      options={options}
      selectedOptions={selectedOptions}
      singleSelection={{ asPlainText: true }}
    />
  );
}
