import React from 'react';
import PropTypes from 'prop-types';

export function Directory({ addBasePath, directories }) {

  const renderDirectories = () => {
    return directories.inTitleOrder.map((directory) => {
      return (
        <div key={directory.id}>
          <a href={addBasePath(directory.path)}>
            {directory.title}
          </a>
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
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.object.isRequired
};
