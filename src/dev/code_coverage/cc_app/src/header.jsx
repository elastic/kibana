import React from "react";

export default function Header() {
  return (
    <header className="App-header">
      {/*<img src={logo} className="App-logo" alt="logo"/>*/}
      <a
        className="App-link"
        href={buildStatsLink()}
        target="_blank"
        rel="noopener noreferrer"
      >
        Some build stats link or something :)
      </a>
    </header>
  );
}

function buildStatsLink() {
  return 'https://build-stats.elastic.co/app/kibana#/dashboard/02b9d310-9513-11e8-a9c0-db5f285c257f?_g=(refreshInterval%3A(pause%3A!f%2Cvalue%3A10000)%2Ctime%3A(from%3Anow%2Fd%2Cmode%3Aquick%2Cto%3Anow%2Fd))'
}
