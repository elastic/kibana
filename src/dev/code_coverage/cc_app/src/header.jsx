import React from "react";

export default function Header({ url }) {
  return (
    <header className="App-header">
      {/*<img src={logo} className="App-logo" alt="logo"/>*/}
      <a
        className="App-link"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Build Stats Dashboard
      </a>
    </header>
  );
}
