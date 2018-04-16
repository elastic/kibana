import { connect } from 'react-redux';
import { getFullscreen } from '../../state/selectors/app';
import { Fullscreen as Component } from './fullscreen';

const mapStateToProps = state => ({
  isFullscreen: getFullscreen(state),
});

export const Fullscreen = connect(mapStateToProps)(Component);
