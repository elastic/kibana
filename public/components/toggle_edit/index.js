import { connect } from 'react-redux';
import { ToggleEdit as Component } from './toggle_edit';
import { getEditing } from '../../state/selectors/app';
import { setEditing } from '../../state/actions/app';


const mapStateToProps = (state) => ({
  editing: getEditing(state),
});

const mapDispatchToProps = ({
  toggle: setEditing,
});

export const ToggleEdit = connect(mapStateToProps, mapDispatchToProps)(Component);
