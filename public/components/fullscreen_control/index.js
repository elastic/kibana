import { connect } from 'react-redux';
import { setFullscreen, selectElement } from '../../state/actions/transient';
import { getFullscreen } from '../../state/selectors/app';
import { FullscreenControl as Component } from './fullscreen_control';

const mapStateToProps = state => ({
  isFullscreen: getFullscreen(state),
});

const mapDispatchToProps = dispatch => ({
  setFullscreen: value => {
    dispatch(setFullscreen(value));
    value && dispatch(selectElement(null));
  },
});

export const FullscreenControl = connect(mapStateToProps, mapDispatchToProps)(Component);
