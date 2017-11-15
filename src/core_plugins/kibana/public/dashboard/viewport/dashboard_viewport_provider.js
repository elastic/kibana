import React from 'react';
import PropTypes from 'prop-types';
import { store } from '../../store';
import { Provider } from 'react-redux';
import { DashboardViewportContainer } from './dashboard_viewport_container';

export function DashboardViewportProvider(props) {
  return (
    <Provider store={store}>
      <DashboardViewportContainer {...props} />
    </Provider>
  );
}

DashboardViewportProvider.propTypes = {
  getContainerApi: PropTypes.func.isRequired,
  getEmbeddableFactory: PropTypes.func.isRequired,
};
