import React from 'react';
import { connect } from 'react-redux';

// TODO: This is currently my dumping ground for things that side effective
// This will be cleaned up before shipping
import '../../state/actions/interpret';

function AppComponent({ expression }) {
  return (
    <div>
      {expression}
    </div>
  );
}

function mapStateToProps(state) {
  return {
    renderable: state.transient.throwAway.renderable,
    expression: state.persistent.throwAway.expression
  };
}

export const App = connect(mapStateToProps)(AppComponent);
