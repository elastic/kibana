import { compose, withState } from 'recompose';
import { connect } from 'react-redux';
import { getEditing } from '../../state/selectors/app';
import { getWorkpadName, getSelectedPage } from '../../state/selectors/workpad';
import { setEditing } from '../../state/actions/transient';
import { getAssets } from '../../state/selectors/assets';
import { addElement } from '../../state/actions/elements';
import { WorkpadHeader as Component } from './workpad_header';

const mapStateToProps = state => ({
  editing: getEditing(state),
  workpadName: getWorkpadName(state),
  selectedPage: getSelectedPage(state),
  hasAssets: Object.keys(getAssets(state)).length ? true : false,
});

const mapDispatchToProps = dispatch => ({
  setEditing: editing => dispatch(setEditing(editing)),
  addElement: pageId => partialElement => dispatch(addElement(pageId, partialElement)),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...stateProps,
  ...dispatchProps,
  ...ownProps,
  addElement: dispatchProps.addElement(stateProps.selectedPage),
  toggleEditing: () => dispatchProps.setEditing(!stateProps.editing),
});

export const WorkpadHeader = compose(
  withState('showElementModal', 'setShowElementModal', false),
  connect(mapStateToProps, mapDispatchToProps, mergeProps)
)(Component);
