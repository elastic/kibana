import React from "react";
import TestRunnerItemList from './test_runner_item_list';

export default function CoverageItem({item, currentJobTimeStamp, testRunnerTypes, isCurrent, currentCiRunUrl}) {
  if (isCurrent) {
    console.log(`\n### currentJobTimeStamp: \n\t${currentJobTimeStamp}`);
  }
  const classes = 'max-w-sm rounded overflow-hidden shadow-lg shadow-2xl';
  return (
    <div className="flex-horizontal-center font-bold text-xl mb-2">
      <div className={(isCurrent) ? `${classes} App-current` : classes}>
          <div className="px-6 py-4 bg-white">
            {isCurrent ? ciRunLabel(isCurrent, currentCiRunUrl) : undefined}
            <div className="text-gray-700 text-base ">
              <TestRunnerItemList historicalItem={item} testRunnerTypes={testRunnerTypes} />
            </div>
          </div>
      </div>
    </div>
  );
}

function ciRunLabel(isCurrent, currentCiRunUrl) {
  return (
    <div className="font-bold text-xl mb-2">
      {isCurrent ? anchor(currentCiRunUrl) : undefined}
    </div>
  );
}

function anchor(currentCiRunUrl) {
  return (
    <>
      <a
        className="App-link flex justify-center"
        href={currentCiRunUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Current Job
      </a>
      <hr />
    </>
  );
}

