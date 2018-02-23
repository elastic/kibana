import { connect } from 'react-redux';
import { compose, withProps, withState, withHandlers, lifecycle } from 'recompose';
import { debounce } from 'lodash';
import { getFullscreen } from '../../state/selectors/app.js';
import { defaultIdent } from '../../lib/fullscreen.js';
import { getWindow } from '../../lib/get_window.js';
import { Fullscreen as Component } from './fullscreen';

const win = getWindow();

const mapStateToProps = state => ({
  isFullscreen: getFullscreen(state),
});

const getWindowSize = () => ({
  width: win.innerWidth,
  height: win.innerHeight,
});

export const Fullscreen = compose(
  withProps(({ ident }) => ({
    ident: ident || defaultIdent,
  })),
  withState('windowSize', 'setWindowSize', getWindowSize()),
  withHandlers({
    windowResizeHandler: ({ setWindowSize }) =>
      debounce(() => {
        setWindowSize(getWindowSize());
      }, 100),
  }),
  connect(mapStateToProps),
  lifecycle({
    componentWillMount() {
      win.addEventListener('resize', this.props.windowResizeHandler);
    },
    componentWillUnmount() {
      win.removeEventListener('resize', this.props.windowResizeHandler);
    },
  })
)(Component);
