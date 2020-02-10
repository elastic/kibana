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

import React from "react";
import HistoricalItem from './historical_item';
// import TestRunnerItemList from './test_runner_item_list';

const renderItem = testRunnerTypes => currentJobNumber => (x, i) => {
  return (
      <HistoricalItem
        item={x}
        key={i}
        currentJobNumber={currentJobNumber}
        testRunnerTypes={testRunnerTypes}
      />
      // {/*<TestRunnerItemList testRunnerTypes={testRunnerTypes} />*/}
);
};

export default function HistoricalList({testRunnerTypes, historicalItems, currentJobNumber }) {
  const renderWithRunners = renderItem(testRunnerTypes);
  return (
    <div className="font-bold text-xl mb-2">
      Historical Items - Compare to Current? [{currentJobNumber}]
      <ul>
        {historicalItems.reverse().map((x, i) => renderWithRunners(currentJobNumber)(x, i))}
      </ul>
    </div>
     );
}
