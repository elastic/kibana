import React from "react";
import TestRunnerItem from './test_runner_item';

export default function TestRunnerItemList({items}) {

  return (
    <ul>
      {items.map(renderTestRunnerItem)}
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
