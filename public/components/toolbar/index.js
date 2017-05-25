import { connect } from 'react-redux';

import { getEditing } from '../../state/selectors/app';

import { Toolbar as Component } from './toolbar';

const mapStateToProps = (state) => ({
  editing: getEditing(state),
});

/*
const mapDispatchToProps = ({
  toggleEditing,
});
*/

export const Toolbar = connect(mapStateToProps /*, mapDispatchToProps*/)(Component);
