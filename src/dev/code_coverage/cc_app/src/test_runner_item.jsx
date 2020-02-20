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

function timestamp(historicalItem) {
  return [.../coverage\/\d*\/(\d*-.*Z)/gm.exec(historicalItem)][1];
}

function href(type) {
  const prefix = 'https://storage.cloud.google.com/kibana-ci-artifacts/jobs/elastic%2Bkibana%2Bcode-coverage';
  const postfix = `target/kibana-coverage/${type}-combined/index.html`;
  return function hrefInner(historicalItem) {
    return `${prefix}/${jobNum(historicalItem)}/${timestamp(historicalItem)}/${postfix}`;
  }
}

function jobNum(historicalItem) {
  return [.../coverage\/(\d*)\/\d*-.*Z/gm.exec(historicalItem)][1];
}

