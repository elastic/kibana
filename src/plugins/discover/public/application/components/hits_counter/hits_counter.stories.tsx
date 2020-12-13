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

/* eslint-disable no-console */

import * as React from 'react';
import { HitsCounter } from './hits_counter';

export default {
  component: HitsCounter,
  title: 'Discover/Components/HitsCounter',
  argTypes: {
    onResetQuery: { action: 'onResetQuery' },
  },
};

export function Example() {
  return (
    <HitsCounter
      hits={0}
      showResetButton={false}
      onResetQuery={(...args) => console.log('onResetQuery', ...args)}
    />
  );
}

export function WithResetButton() {
  return (
    <HitsCounter
      hits={0}
      showResetButton={true}
      onResetQuery={(...args) => console.log('onResetQuery', ...args)}
    />
  );
}

export function ManyHits(parameters: any) {
  return <HitsCounter hits={10500} showResetButton onResetQuery={parameters.onResetQuery} />;
}

export function Interactive(parameters: any) {
  return (
    <HitsCounter
      hits={parameters.hits}
      showResetButton={parameters.showResetButton}
      onResetQuery={parameters.onResetQuery}
    />
  );
}

Interactive.args = {
  hits: 500,
  showResetButton: true,
};

Interactive.argTypes = {
  hits: { control: { type: 'range', min: 0, max: 1e6 } },
  showResetButton: { control: { type: 'boolean' } },
};
