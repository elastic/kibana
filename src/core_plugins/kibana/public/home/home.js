import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiButton
} from 'ui_framework/components';

export function Home() {
  return (
    <div>
      <h1>
        Add data to Kibana
      </h1>
      <p>
        Didn't find what you were looking for?
        <KuiButton buttonType="secondary">
          <a href="#/home/directory">View directory</a>
        </KuiButton>
      </p>
    </div>
  );
}
