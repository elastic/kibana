import { connect } from 'react-redux';
import { setFullscreen } from '../../state/actions/transient';
import { getFullscreen } from '../../state/selectors/app';
import { FullscreenControl as Component } from './fullscreen_control';

const mapStateToProps = state => ({
  isFullscreen: getFullscreen(state),
});

const mapDispatchToProps = {
  setFullscreen,
};

export const FullscreenControl = connect(mapStateToProps, mapDispatchToProps)(Component);
