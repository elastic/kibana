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

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggParamEditorProps } from '../agg_param_props';
import { StringParamEditor } from './string';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { isNumberType } from '../../../../../../plugins/data/public/search/aggs/buckets';
import { NumberRow, NumberRowModel } from './components/number_list/number_row';
import {
  EMPTY_STRING,
  getInitModelList,
  getNextModel,
  getRange,
  parse,
} from './components/number_list/utils';

export function IncludeExcludeParamEditor(props: AggParamEditorProps<any>) {
  const [models, setModels] = useState(getInitModelList([]));
  const numberRange = useMemo(() => getRange('[-Infinity,Infinity]'), []);

  useEffect(() => {
    console.log(props.value);
  }, [props.value]);

  const onUpdate = useCallback((modelList: NumberRowModel[]) => {
    setModels(modelList);
    props.setValue(modelList.map(({ value }) => (value === EMPTY_STRING ? undefined : value)));
  }, []);

  const onChangeValue = useCallback(
    ({ id, value }: { id: string; value: string }) => {
      const parsedValue = parse(value);

      onUpdate(
        models.map(model => {
          if (model.id === id) {
            return {
              id,
              value: parsedValue,
              isInvalid: false,
            };
          }
          return model;
        })
      );
    },
    [numberRange, models, onUpdate]
  );

  // Add an item to the end of the list
  const onAdd = useCallback(() => {
    const newArray = [...models, getNextModel(models, numberRange)];
    onUpdate(newArray);
  }, [models, numberRange, onUpdate]);

  const onDelete = useCallback(
    (id: string) => {
      const newArray = models.filter(model => model.id !== id);
      onUpdate(newArray);
    },
    [models, onUpdate]
  );

  return isNumberType(props.agg) ? (
    <EuiFormRow
      label={props.aggParam.displayName || props.aggParam.name}
      fullWidth={true}
      compressed
    >
      <>
        {models.map((model, arrayIndex) => (
          <Fragment key={model.id}>
            <NumberRow
              isInvalid={false}
              disableDelete={models.length === 1}
              model={model}
              labelledbyId={''}
              range={numberRange}
              onDelete={onDelete}
              onChange={onChangeValue}
              onBlur={props.setTouched}
              autoFocus={models.length !== 1 && arrayIndex === models.length - 1}
            />
            {models.length - 1 !== arrayIndex && <EuiSpacer size="s" />}
          </Fragment>
        ))}
        <EuiSpacer size="s" />
        <EuiFlexItem>
          <EuiButtonEmpty iconType="plusInCircleFilled" onClick={onAdd} size="xs">
            <FormattedMessage
              id="visDefaultEditor.controls.numberList.addUnitButtonLabel"
              defaultMessage="Add value"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </>
    </EuiFormRow>
  ) : (
    <StringParamEditor {...props} />
  );
}
