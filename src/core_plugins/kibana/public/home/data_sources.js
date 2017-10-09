import React from 'react';
import PropTypes from 'prop-types';

export function DataSources({ addBasePath }) {

  return (
    <div>
      <a className="kuiLink" href="#/home">Home</a> / <a className="kuiLink" href="#/home/directory">Directory</a> / Data Sources
      <h2 className="kuiTitle">
        Data Sources
      </h2>
    </div>
  );
}

DataSources.propTypes = {
  addBasePath: PropTypes.func.isRequired
};
