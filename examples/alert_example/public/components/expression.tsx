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

import React, { Fragment, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  EuiText,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';
import {
  WhenExpression,
  OfExpression,
  ThresholdExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../x-pack/plugins/triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { builtInAggregationTypes } from '../../../../x-pack/plugins/triggers_actions_ui/public/common/constants';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AggregationType } from '../../../../x-pack/plugins/triggers_actions_ui/public/common/types';

interface ExampleProps {
  testAggType?: string;
  testAggField?: string;
  errors: { [key: string]: string[] };
}

interface WeatherProps {
  location?: string;
  weather?: string;
  errors: { [key: string]: string[] };
}

interface StockProps {
  alertParams: {
    stock?: string;
    price?: number[];
    thresholdComparator?: string;
  };
  setAlertParams: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
}

interface CustomProps {
  param1?: string;
  param2?: string;
  errors: { [key: string]: string[] };
}

export const NoExpression: React.FunctionComponent = () => {
  return (
    <Fragment>
      <EuiTitle size="xxs">
        <p>This alert type does not need configuration.</p>
      </EuiTitle>
    </Fragment>
  );
};

export const CustomExpression: React.FunctionComponent<CustomProps> = ({
  param1,
  param2,
  errors,
}) => {
  return (
    <Fragment>
      <EuiTitle size="xxs">
        <p>These are fields specific to this alert type, that are not part of the trigger:</p>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGroup gutterSize="s" wrap direction="column">
        <EuiFlexItem grow={true}>
          <EuiFormRow
            label="Alert type specific text field"
            helpText="I will populate param1 in the alert type."
          >
            <EuiFieldText name="first" />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiSpacer />
        <EuiFlexItem grow={true}>
          <EuiFormRow
            label="Alert type specific dropdown"
            labelAppend={
              <EuiText size="xs">
                <EuiLink>Link to some help</EuiLink>
              </EuiText>
            }
            helpText="I will populate param2 in the alert type."
          >
            <EuiSelect
              hasNoInitialSelection
              options={[
                { value: 'option_one', text: 'Option one' },
                { value: 'option_two', text: 'Option two' },
                { value: 'option_three', text: 'Option three' },
              ]}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};

export const WeatherExpression: React.FunctionComponent = () => {
  return (
    <Fragment>
      <EuiTitle size="xxs">
        <p>This alert type does not need configuration.</p>
      </EuiTitle>
    </Fragment>
  );
};

export const stocks: { [key: string]: AggregationType } = {
  Elastic: {
    text: 'Elastic',
    fieldRequired: true,
    value: 'Elastic',
    validNormalizedTypes: ['number'],
  },
  Microsoft: {
    text: 'Microsoft',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: 'Microsoft',
  },
  Alphabet: {
    text: 'Alphabet',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: 'Alphabet',
  },
  Amazon: {
    text: 'Amazon',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: 'Amazon',
  },
  Tesla: {
    text: 'Tesla',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: 'Tesla',
  },
};

export const StockExpression: React.FunctionComponent<StockProps> = ({
  alertParams,
  setAlertParams,
  errors,
}) => {
  const { stock, price, thresholdComparator } = alertParams;

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <WhenExpression
            aggType={stock ?? 'Elastic'}
            customAggTypesOptions={stocks}
            onChangeSelectedAggType={(selectedAggType: string) => {
              setAlertParams('stock', selectedAggType);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ThresholdExpression
            thresholdComparator={thresholdComparator ?? '>'}
            threshold={price ?? [100]}
            errors={errors}
            onChangeSelectedThreshold={selectedThresholds =>
              setAlertParams('price', selectedThresholds)
            }
            onChangeSelectedThresholdComparator={selectedThresholdComparator =>
              setAlertParams('thresholdComparator', selectedThresholdComparator)
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};

export const ExampleExpression: React.FunctionComponent<ExampleProps> = ({
  testAggType,
  testAggField,
  errors,
}) => {
  const [aggType, setAggType] = useState<string>('count');
  return (
    <Fragment>
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <WhenExpression
            aggType={testAggType ?? 'count'} // defult is 'count'
            onChangeSelectedAggType={(selectedAggType: string) => {
              // console.log(`Set alert type params field "aggType" value as ${selectedAggType}`);
              setAggType(selectedAggType);
            }}
          />
        </EuiFlexItem>
        {aggType && builtInAggregationTypes[aggType].fieldRequired ? (
          <EuiFlexItem grow={false}>
            <OfExpression
              aggField={testAggField}
              fields={[{ normalizedType: 'number', name: 'test' }]} // can be some data from server API
              aggType={aggType}
              errors={errors}
              onChangeSelectedAggField={(selectedAggField?: string) =>
                // console.log(`Set alert type params field "aggField" value as ${selectedAggField}`)
                setAggType('')
              }
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </Fragment>
  );
};
