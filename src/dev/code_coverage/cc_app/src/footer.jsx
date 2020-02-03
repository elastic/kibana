import React from "react";
// import logo from './logo.svg';

export default function Footer() {
  return (
    <header className="App-footer">
      {/*<img src={logo} className="App-logo" alt="logo"/>*/}
      <a
        className="App-link"
        href={gcpLink()}
        target="_blank"
        rel="noopener noreferrer"
      >
        Footer
      </a>
    </header>
  );
}

function gcpLink() {
  return `
https://console.cloud.google.com/storage/browser/kibana-ci-artifacts/
jobs/elastic+kibana+code-coverage/254/2020-01-29T21-23-03Z/?authuser=1
`;
}
