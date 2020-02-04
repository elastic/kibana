import React from "react";
import logo from './logo_kibana_32_color.svg'
export default function Header({ url }) {
  return (
    <header className="App-header">
      <a
        className="App-link"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src={logo}
          className="App-logo"
          alt="logo"
          style={{ height: 20, width: 20}}
        />

        Build Stats
      </a>
    </header>
  );
}
