import { connect } from 'react-redux';

import { getEditing } from '../../state/selectors/app';
import { getWorkpadName } from '../../state/selectors/workpad';
import { fetchAllRenderables as doRefresh } from '../../state/actions/elements';
import { setEditing } from '../../state/actions/transient';

import { getInFlight } from '../../state/selectors/resolved_args';

import { WorkpadHeader as Component } from './workpad_header';

const mapStateToProps = (state) => ({
  editing: getEditing(state),
  workpadName: getWorkpadName(state),
  inFlight: getInFlight(state),
});

const mapDispatchToProps = ({
  setEditing,
  doRefresh,
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    toggleEditing: () => dispatchProps.setEditing(!stateProps.editing),
  });
};

export const WorkpadHeader = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
