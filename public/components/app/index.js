import { connect } from 'react-redux';
import { App as Component } from './app';
import { expressionSet } from '../../state/actions/expression';
import { expressionRun } from '../../state/actions/interpret';

function mapStateToProps(state) {
  return {
    renderable: state.throwAway.renderable,
    expression: state.throwAway.expression
  };
}

const mapDispatchToProps = {
  expressionSet,
  expressionRun,
};

export const App = connect(mapStateToProps, mapDispatchToProps)(Component);
