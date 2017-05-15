import { connect } from 'react-redux';
import { App as Component } from './app';

function mapStateToProps(state) {
  return {
    renderable: state.throwAway.renderable,
  };
}

export const App = connect(mapStateToProps)(Component);
