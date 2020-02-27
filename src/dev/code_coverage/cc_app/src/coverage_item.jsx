import React from "react";
import TestRunnerItemList from './test_runner_item_list';
import { left, right } from './utils/either';

export default function CoverageItem({item, currentJobTimeStamp, testRunnerTypes, isCurrent}) {
  if (isCurrent) {
    console.log(`\n### currentJobTimeStamp: \n\t${currentJobTimeStamp}`);
  }
  const classes = 'max-w-sm rounded overflow-hidden shadow-lg shadow-2xl';
  return (
    <div className="flex-horizontal-center font-bold text-xl mb-2">
      <div className={(isCurrent) ? `${classes} App-current` : classes}>
          <div className="px-6 py-4 bg-white">
            <div className="font-bold text-xl mb-2">
              {anchor(isCurrent, item)}
            </div>
            <div className="text-gray-700 text-base ">
              <TestRunnerItemList historicalItem={item} testRunnerTypes={testRunnerTypes} />
            </div>
          </div>
      </div>
    </div>
  );
}

function anchor(isCurrent, item) {
  return (<a
    className="App-link"
    href={href(item)}
    target="_blank"
    rel="noopener noreferrer"
  >
    {isCurrent ? 'Current Job' : 'Past Job'}
  </a>);
}

function href(x) {
  return ['https://console.cloud.google.com/storage/browser/', x.replace('gs://', '')]
    .join('');
}
