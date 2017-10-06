import React from 'react';
import PropTypes from 'prop-types';

export function Directory({ basePath, directories }) {

  const renderDirectories = () => {
    return directories.inTitleOrder.map((directory) => {
      return (
        <div key={directory.id}>
          {directory.title}
          {directory.description}
        </div>
      );
    });
  };

  return (
    <div>
      <a className="kuiLink" href="#/home">Home</a> / Directory
      <h2 className="kuiTitle">
        Directory
      </h2>
      { renderDirectories() }
    </div>
  );
}

Directory.propTypes = {
  basePath: PropTypes.string.isRequired,
  directories: PropTypes.object.isRequired
};
