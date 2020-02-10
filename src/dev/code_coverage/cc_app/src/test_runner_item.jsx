import React from "react";

export default function TestRunnerItem ({item}) {

  return (
    <div>
      <a
        className="App-link"
        href={href(item)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.type} PUT TIMESTAMP HERE
      </a>
    </div>
  );
}

function href(item) {
  return `target/kibana-coverage/${item.type}-combined/index.html`;
}
