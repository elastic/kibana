import React from "react";

import timestamp from './utils/timestamp';

export default function TestRunnerItem ({historicalItem, testRunnerItem}) {
  const { type } = testRunnerItem;
  const typeHref = href(type);

  return (
    <div className="flex justify-center text-black">
      <a
        className="App-link"
        href={typeHref(historicalItem)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {type}
      </a>
    </div>
  );
}

function href(type) {
  return item => [
    `https://kibana-coverage.elastic.dev/jobs/elastic+kibana+code-coverage/`,
    timestamp(item),
    `/live_cc_app/coverage_data/${type}-combined/index.html`
  ].join('');
}
