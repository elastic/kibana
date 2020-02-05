import React from "react";
import TestRunnerItem from './test_runner_item';

export default function TestRunnerItemList({testRunnerTypes}) {

  return (
    <ul>
      {testRunnerTypes.map(renderTestRunnerItem)}
    </ul>
  );
}

function renderTestRunnerItem(item) {
  return (
    <TestRunnerItem
      item={item}
      key={item.id}
    />
  );
}
