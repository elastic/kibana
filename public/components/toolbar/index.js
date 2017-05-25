import { connect } from 'react-redux';
import { compose, withState } from 'recompose';

import { getEditing } from '../../state/selectors/app';

import { Toolbar as Component } from './toolbar';

const mapStateToProps = (state) => ({
  editing: getEditing(state),
});

export const Toolbar = compose(
  connect(mapStateToProps),
  withState('tray', 'setTray', props => props.tray),
)(Component);
