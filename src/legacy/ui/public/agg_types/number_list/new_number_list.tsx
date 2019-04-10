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
import { isUndefined } from 'lodash';

import { EuiText, EuiSpacer, EuiButton, EuiFlexItem, } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseRange, Range } from '../../utils/range';
import { NumberRow } from './number_row';

interface NumberListProps {
  list: any[];
  unitName: string;
  validateAscendingOrder?: boolean;
  labelledbyId: string;
  range?: string
  onChange(list: any[]): void;
}

const defaultRange = parseRange('[0,Infinity)');

function NumberList({ list = [], unitName, validateAscendingOrder, labelledbyId, range, onChange }: NumberListProps) {
  let numberRange: Range;

  try {
    numberRange = range ? parseRange(range) : defaultRange;
  } catch (e) {
    throw new TypeError('Unable to parse range: ' + e.message);
  }

  const validateAscOrder = isUndefined(validateAscendingOrder) ? true : validateAscendingOrder;

  function parse(value: string) {
    const parsedValue = parseFloat(value);
  
    if (isNaN(parsedValue)) {
  
    }
  
    if (!range.within(parsedValue)) {
        return INVALID
    };
  
    if (validateAscOrder && index > 0) {
      const i = index - 1;
      const list = numberListCntr.getList();
      const prev = list[i];
      if (num <= prev) return INVALID;
    }
  
      return num;
  }
  
  const onChangeValue = (index: number, newValue: number) => {
    list[index] = newValue;
    onChange(list);
  };

  /**
   * Add an item to the end of the list
   * 
   * @return {undefined}
   */
  const onAdd = () => {

    function getNext() {
      if (list.length === 0) {
        // returning NaN adds an empty input
        return NaN;
      }

      const next = _.last(list) + 1;
      if (next < numberRange.max) {
        return next;
      }

      return numberRange.max - 1;
    }

    onChange([...list, '']);
  };
  
  /**
   * Remove an item from list by index
   * 
   * @param  {number} index
   * @return {undefined}
   */
  const onDelete = (index: number) => {
    onChange(list.filter((item, currentIndex) => index !== currentIndex))
  };

  const listItems = list.map((number, index) =>
    <div key={`numberRow${number}${index}`}>
      <NumberRow
        disableDelete={list.length === 1}
        model={{ index, value: number }}
        labelledbyId={labelledbyId}
        range={numberRange}
        onDelete={onDelete}
        onChange={onChangeValue}
      />
      <EuiSpacer size="s" />
    </div>
  );

  return (
    <>
      {list.length ? listItems : (
        <EuiText textAlign="center" size="s" >
          <FormattedMessage
            id="common.ui.numberList.noUnitSelectedDescription"
            defaultMessage="Please specify at least one {unitName}"
            values={{ unitName }}
          />
        </EuiText>
      )}
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButton
          iconType="plusInCircle"
          fill={true}
          fullWidth={true}
          onClick={onAdd}
          size="s"
        >
          <FormattedMessage
            id="common.ui.numberList.addUnitButtonLabel"
            defaultMessage="Add {unitName}"
            values={{ unitName }}
          />
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}

export { NumberList };
