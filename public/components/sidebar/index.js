import { connect } from 'react-redux';
import { Sidebar as Component } from './sidebar';
import { getSelectedElement } from '../../state/selectors/workpad';

const mapStateToProps = (state) => ({
  element: getSelectedElement(state),
});

export const Sidebar = connect(mapStateToProps)(Component);
