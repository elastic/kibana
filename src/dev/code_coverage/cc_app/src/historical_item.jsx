import React from "react";
import TestRunnerItemList from './test_runner_item_list';

export default function HistoricalItem({item, currentJobNumber, testRunnerTypes}) {
  return (
    <>
      <div className="max-w-sm rounded overflow-hidden shadow-lg">
        {/*<img className="w-full" src="/img/card-top.jpg" alt="Sunset in the mountains"></img>*/}
          <div className="px-6 py-4">
            <div className="font-bold text-xl mb-2">
              Job - {title(item)}
            </div>
            <div className="text-gray-700 text-base">
              <TestRunnerItemList testRunnerTypes={testRunnerTypes} />
              <a
                className="App-link"
                href={href(item)}
                target="_blank"
                rel="noopener noreferrer"
              >
                GCP Bucket
              </a>
            </div>
          </div>
          {/*<div className="px-6 py-4">*/}
          {/*  <span*/}
          {/*    className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">#photography</span>*/}
          {/*  <span*/}
          {/*    className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">#travel</span>*/}
          {/*  <span*/}
          {/*    className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">#winter</span>*/}
          {/*</div>*/}

      </div>
    </>
  );
}

function title(item) {
  const dropPrefix = () => ['gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/', ''];
  const dropPostfix = () => [/(\d.*)\/\d.*$/, '$1'];
  return item
    .replace(...dropPrefix())
    .replace(...dropPostfix());
}

function href(x) {
  return ['https://console.cloud.google.com/storage/browser/', x.replace('gs://', '')]
    .join('');
}
