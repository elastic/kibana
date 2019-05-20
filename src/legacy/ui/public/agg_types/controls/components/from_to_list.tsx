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

import React, { useState, useEffect } from 'react';
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface FromToObject {
  from: string;
  to: string;
}

interface FromToModel extends FromToObject {
  id: string;
}

interface FromToListProps {
  labelledbyId: string;
  list: FromToObject[];
  onChange(list: FromToObject[]): void;
}

const generateId = htmlIdGenerator();

function FromToList({ labelledbyId, list, onChange }: FromToListProps) {
  const [models, setModels] = useState(list.map(item => ({ ...item, id: generateId() })));
  const deleteBtnAriaLabel = i18n.translate('common.ui.aggTypes.ipRanges.removeRangeAriaLabel', {
    defaultMessage: 'Remove this range',
  });

  const onUpdate = (modelList: FromToModel[]) => {
    setModels(modelList);
    onChange(modelList.map(({ from, to }) => ({ from, to })));
  };

  const onChangeValue = (modelName: 'from' | 'to', index: number, value: string) => {
    models[index][modelName] = value;
    onUpdate(models);
  };
  const onDelete = (id: string) => {
    const newArray = models.filter(model => model.id !== id);
    onUpdate(newArray);
  };

  const getUpdatedModels = (objList: FromToObject[], modelList: FromToModel[]) => {
    return objList.map((item, index) => {
      const model = modelList[index] || { id: generateId() };
      return {
        ...model,
        ...item,
      };
    });
  };

  useEffect(
    () => {
      setModels(getUpdatedModels(list, models));
    },
    [list]
  );

  return (
    <>
      {models.map((item, index) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center" key={item.id}>
          <EuiFlexItem>
            <EuiFieldText
              aria-labelledby={labelledbyId}
              // isInvalid={isInvalid}
              onChange={ev => {
                onChangeValue('from', index, ev.target.value);
              }}
              value={item.from}
              // onBlur={onBlur}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFieldText
              aria-labelledby={labelledbyId}
              // isInvalid={isInvalid}
              onChange={ev => {
                onChangeValue('to', index, ev.target.value);
              }}
              value={item.to}
              // onBlur={onBlur}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={deleteBtnAriaLabel}
              disabled={models.length === 1}
              color="danger"
              iconType="trash"
              onClick={() => onDelete(item.id)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </>
  );
}

export { FromToList };
