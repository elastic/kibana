import React from "react";
// import logo from './logo.svg';

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
  return 'some build stats url'
}
