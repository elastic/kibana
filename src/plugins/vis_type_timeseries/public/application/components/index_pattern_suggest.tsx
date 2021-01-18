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
import React, { useEffect, useState, useCallback } from 'react';
import { EuiSuggest, EuiSuggestProps } from '@elastic/eui';
import { getDataStart } from '../../services';
import { INDEXES_SEPARATOR } from '../../../common/constants';

interface IndexPatternSuggestProps {
  value: string;
  indexPatternName: string;
  defaultIndexPattern: string;
  onChange: Function;
  disabled?: boolean;
}

const toSuggestOptions = (options: string[]) =>
  options.map((label) => ({ type: { iconType: 'indexPatternApp', color: 'tint5' }, label }));

export const IndexPatternSuggest = ({
  value,
  indexPatternName,
  onChange,
  disabled,
  defaultIndexPattern,
}: IndexPatternSuggestProps) => {
  const [availableIndexes, setAvailableIndexes] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>(value);

  const splittedIndexes = value.split(INDEXES_SEPARATOR);
  const prefix = splittedIndexes[Math.max(0, splittedIndexes.length - 1)];

  const suggestions = availableIndexes.filter(
    (index) =>
      index !== prefix && index.includes(prefix) && !inputValue.includes(index + INDEXES_SEPARATOR)
  );

  useEffect(() => {
    async function fetchIndexes() {
      setAvailableIndexes(await getDataStart().indexPatterns.getTitles());
    }

    fetchIndexes();
  }, []);

  useEffect(() => {
    if (inputValue !== value) {
      onChange({
        [indexPatternName]: inputValue,
      });
    }
  }, [onChange, inputValue, indexPatternName, value]);

  const onItemClick: EuiSuggestProps['onItemClick'] = useCallback(
    ({ label }) => {
      setInputValue(value.substring(0, value.lastIndexOf(prefix)) + label);
    },
    [value, prefix]
  );

  const onInputChange: EuiSuggestProps['onInputChange'] = useCallback((target) => {
    setInputValue(target.value);
  }, []);

  return (
    <EuiSuggest
      onInputChange={onInputChange}
      onItemClick={onItemClick}
      // @ts-ignore
      value={inputValue}
      placeholder={defaultIndexPattern}
      disabled={disabled}
      suggestions={toSuggestOptions(suggestions)}
      data-test-subj="metricsIndexPatternInput"
    />
  );
};
