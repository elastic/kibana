import React from "react";
import TestRunnerItem from './test_runner_item';

export default function TestRunnerItemList({testRunnerTypes}) {

  return (
    <ul>
      {testRunnerTypes.map(renderItem)}
    </ul>
  );
}

function renderItem(item) {
  return (
    <TestRunnerItem
      item={item}
      key={item.id}
    />
  );
}
