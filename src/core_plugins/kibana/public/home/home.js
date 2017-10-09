import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiButton
} from 'ui_framework/components';

export function Home({ addBasePath, directories, directoryCategories }) {

  const renderDirectories = (category) => {
    return directories.inTitleOrder
    .filter((directory) => {
      return directory.showOnHomePage && directory.category === category;
    })
    .map((directory) => {
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
      <h2>
        Add data to Kibana
      </h2>
      <div>
        <h3>
          Visualize and explore data
        </h3>
        { renderDirectories(directoryCategories.DATA) }
      </div>

      <div>
        <h3>
          Manage and administrate the Elastic stack
        </h3>
        { renderDirectories(directoryCategories.ADMIN) }
      </div>
      <p>
        Didn&apos;t find what you were looking for?
        <KuiButton buttonType="secondary">
          <a href="#/home/directory">View directory</a>
        </KuiButton>
      </p>
    </div>
  );
}

Home.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.object.isRequired,
  directoryCategories: PropTypes.object.isRequired
};
