import { connect } from 'react-redux';

import { getEditing } from '../../state/selectors/app';
import { toggleEditing } from '../../state/actions/app';

import { App as Component } from './app';

const mapStateToProps = (state) => ({
  editing: getEditing(state),
});

const mapDispatchToProps = ({
  toggleEditing,
});

export const App = connect(mapStateToProps, mapDispatchToProps)(Component);
