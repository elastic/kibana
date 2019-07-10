import * as React from 'react';
import { analyzeTab } from './navigation_tabs';

const AnalyzeMenu = () => {
  return (
    <li id={`tab_${analyzeTab.id}`} className="dropdown nav-item active">
      <a
        id="analyze-dropdown"
        className="nav-link dropdown-toggle"
        data-toggle="dropdown"
        role="button"
        aria-haspopup="true"
        aria-expanded="false"
      >
        {analyzeTab.display}
      </a>
      <ul className="dropdown-menu" aria-labelledby="analyze-dropdown">
        <a className="dropdown-item" href="/kibana7/app/kibana#/discover">
          Discover
        </a>
        <a className="dropdown-item" href="/kibana7/app/kibana#/visualize">
          Visualize
        </a>
        <a className="dropdown-item" href="/kibana7/app/kibana#/dashboards?title=Analyze-Dashboard">
          Dashboards
        </a>
        <a className="dropdown-item" href="/kibana7/app/kibana#/management/kibana/objects">
          Dashboard Settings
        </a>
      </ul>
    </li>
  );
};

export default AnalyzeMenu;
