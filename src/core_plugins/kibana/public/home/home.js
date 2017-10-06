import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiButton
} from 'ui_framework/components';

export function Home({ basePath, directories, directoryCategories }) {

  const renderDirectories = (category) => {
    return directories.inTitleOrder
    .filter((directory) => {
      return directory.category === category;
    })
    .map((directory) => {
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
        Didn't find what you were looking for?
        <KuiButton buttonType="secondary">
          <a href="#/home/directory">View directory</a>
        </KuiButton>
      </p>
    </div>
  );
}

Home.propTypes = {
  basePath: PropTypes.string.isRequired,
  directories: PropTypes.object.isRequired,
  directoryCategories: PropTypes.object.isRequired
};
