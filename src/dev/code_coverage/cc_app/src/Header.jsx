import React from "react";
import logo from './logo.svg';

export default function Header() {
  return (
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo"/>
      <p>
         Time to see some coverage metrics right? :)
      </p>
      <a
        className="App-link"
        href="https://console.cloud.google.com/storage/browser/kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/254/2020-01-29T21-23-03Z/?authuser=1"
        target="_blank"
        rel="noopener noreferrer"
      >
        Example site in GCP
      </a>
    </header>
  );
}
