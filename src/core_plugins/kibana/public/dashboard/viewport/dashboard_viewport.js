import React from 'react';
import PropTypes from 'prop-types';
import { store } from '../../store';
import { Provider } from 'react-redux';
import { DashboardContainer } from './dashboard_container';

export class DashboardViewport extends React.Component {
  render() {
    return (
      <Provider store={store}>
        <DashboardContainer {...this.props} />
      </Provider>
    );
  }
}

DashboardViewport.propTypes = {
  getContainerApi: PropTypes.func.isRequired,
  getEmbeddableHandler: PropTypes.func.isRequired,
};
