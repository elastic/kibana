import { connect } from 'react-redux';
import { getSelectedElement } from '../../state/selectors/workpad';
import { Sidebar as Component } from './sidebar';

const mapStateToProps = (state) => ({
  element: getSelectedElement(state),
});

export const Sidebar = connect(mapStateToProps)(Component);
