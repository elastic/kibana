import { connect } from 'react-redux';
import { getWorkpadColors } from '../../state/selectors/workpad';
import { addColor, removeColor } from '../../state/actions/workpad';

import { WorkpadColorPicker as Component } from './workpad_color_picker';

const mapStateToProps = state => ({
  colors: getWorkpadColors(state),
});

const mapDispatchToProps = {
  addColor,
  removeColor,
};

export const WorkpadColorPicker = connect(mapStateToProps, mapDispatchToProps)(Component);
