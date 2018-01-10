import { connect } from 'react-redux';
import { getWorkpadColors } from '../../state/selectors/workpad';
import { addColor, removeColor } from '../../state/actions/workpad';

import { ColorPicker as Component } from './color_picker';

const mapStateToProps = state => ({
  colors: getWorkpadColors(state),
});

const mapDispatchToProps = {
  addColor,
  removeColor,
};

export const ColorPicker = connect(mapStateToProps, mapDispatchToProps)(Component);
