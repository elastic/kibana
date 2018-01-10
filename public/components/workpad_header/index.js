import { connect } from 'react-redux';
import { getEditing } from '../../state/selectors/app';
import { getWorkpadName } from '../../state/selectors/workpad';
import { setEditing } from '../../state/actions/transient';
import { WorkpadHeader as Component } from './workpad_header';

const mapStateToProps = state => ({
  editing: getEditing(state),
  workpadName: getWorkpadName(state),
});

const mapDispatchToProps = {
  setEditing,
};

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...stateProps,
  ...dispatchProps,
  ...ownProps,
  toggleEditing: () => dispatchProps.setEditing(!stateProps.editing),
});

export const WorkpadHeader = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
