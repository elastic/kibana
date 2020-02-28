import React from "react";
import TestRunnerItem from './test_runner_item';

export default function TestRunnerItemList ({historicalItem, testRunnerTypes}) {
  const renderWithHistorical = renderItem(historicalItem);
  return (
    <div className="App-TestRunner-List">
      <ul>
        <span className="flex justify-center text-black">Test Runners</span>
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
