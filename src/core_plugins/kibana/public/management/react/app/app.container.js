import { connect } from 'react-redux';
import { App as AppComponent } from './app.component';

const App = connect(
  state => {
    return {
      version: state.app.version,
      sections: state.app.config.items,
    };
  }
)(AppComponent);

export { App };
