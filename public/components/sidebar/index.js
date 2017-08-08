import { connect } from 'react-redux';
import { compose, branch, renderComponent } from 'recompose';
import { Sidebar as Component } from './sidebar';
import { getSelectedElement } from '../../state/selectors/workpad';
import { GlobalConfig } from './global_config';

const mapStateToProps = (state) => {
  return {
    element: getSelectedElement(state),
  };
};

export const Sidebar = compose(
  connect(mapStateToProps),
  branch(props => !props.element, renderComponent(GlobalConfig)),
)(Component);
