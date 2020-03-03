import React from "react";

export default function TestRunnerItem ({historicalItem, testRunnerItem}) {
  const { type } = testRunnerItem;
  const typeHref = href(type);

  return (
    <div>
      <div>
        {type}
      </div>
      <a
        className="App-link"
        href={typeHref(historicalItem)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {timestamp(historicalItem)}
      </a>
    </div>
  );
}

const findTimeStampRe = () => /coverage\/(\d*-.*Z)/gm;
function timestamp(item) {
  return [...findTimeStampRe().exec(item)][1];
}

function href(type) {
  return item => [
    `https://kibana-coverage.elastic.dev/jobs/elastic+kibana+code-coverage/`,
    timestamp(item),
    `/live_cc_app/coverage_data/${type}-combined/index.html`
  ].join('');
}
