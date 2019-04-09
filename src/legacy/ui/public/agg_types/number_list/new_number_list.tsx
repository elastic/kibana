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

import { EuiFieldNumber, EuiSpacer, EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { parseRange, Range } from '../../utils/range';

interface NumberListProps {
  list: any[];
  unitName: string;
  validateAscendingOrder: boolean;
  labelledbyId: string;
  range?: string
  onchange(index: number, action: 1 | -1): void;
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

  const onChangeValue = () => {};

  /**
   * Add an item to the end of the list
   * 
   * @return {undefined}
   */
  const onAdd = () => {
    if (!list) return;

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

    onChange(getNext(), 1);
  };
  
  /**
   * Remove an item from list by index
   * 
   * @param  {number} index
   * @return {undefined}
   */
  const onDelete = (index: number) => {
    if (!list) return;

    //list.splice(index, 1);
    onChange(index, -1);
  };

  const listItems = list.map((number, index) =>
    <EuiFlexGroup key={index} responsive={false} alignItems="center">
      <EuiFlexItem>
        <EuiFieldNumber key={number.toString()}
          aria-labelledby={labelledbyId}
          onChange={onChangeValue}
          value={number}
          fullWidth={true}
          min={numberRange.min}
          max={numberRange.max}
        />
      </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Remove this rank value">
            <EuiButtonIcon
              aria-label="Remove this rank value"
              color="danger"
              iconType="trash"
              onClick={() => onDelete(index)}
            />
          </EuiToolTip>
        </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <div>
      {list.length ? listItems : (
        <FormattedMessage
        id="common.ui.numberList.noUnitSelectedDescription"
        defaultMessage="Please specify at least one {unitName}"
        values={{ unitName }}
      />
      )}
      <EuiSpacer size="m" />
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
      
    </div>
    
  );
}

export { NumberList };
