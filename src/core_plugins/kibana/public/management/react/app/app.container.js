/* eslint-disable */
import { connect } from 'react-redux';
import App from './app.component';

export default connect(
  state => {
    return {
      version: state.app.version,
      sections: state.app.config.items,
    }
  }
)(App);
