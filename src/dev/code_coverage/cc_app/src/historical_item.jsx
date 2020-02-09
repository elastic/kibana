import React from "react";

export default function HistoricalItem({item, currentJobNumber}) {

  console.log(`\n### currentJobNumber: \n\t${currentJobNumber}`);

  return (
    <div>
      <div className="max-w-sm rounded overflow-hidden shadow-lg">
        {/*<img className="w-full" src="/img/card-top.jpg" alt="Sunset in the mountains"></img>*/}
          <div className="px-6 py-4">
            <div className="font-bold text-xl mb-2">
              Job Number - {title(item)}
            </div>
            <p className="text-gray-700 text-base">
              <a
                className="App-link"
                href={href(item)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item}
              </a>
            </p>
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
    </div>
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
