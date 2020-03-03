import React from "react";
import TestRunnerItem from './test_runner_item';
import timestamp from './utils/timestamp';

export default function TestRunnerItemList ({historicalItem, testRunnerTypes}) {
  const renderWithHistorical = renderItem(historicalItem);
  return (
    <div className="App-TestRunner-List">
      <ul>
        {timestamp(historicalItem)}
        {testRunnerTypes.map(renderWithHistorical)}
      </ul>
    </div>
  );
}

function renderItem (historicalItem) {
  return function renderItemInner (testRunnerItem) {
    return (
      <TestRunnerItem
        historicalItem={historicalItem}
        testRunnerItem={testRunnerItem}
        key={testRunnerItem.id}
      />
    );
  }
}
