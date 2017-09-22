import { connect } from 'react-redux';
import { compose, withProps, withState, withHandlers, lifecycle } from 'recompose';
import { debounce } from 'lodash';
import { Fullscreen as Component } from './fullscreen';
import { getFullscreen } from '../../state/selectors/app.js';
import { defaultIdent } from '../../lib/fullscreen.js';

const mapStateToProps = (state) => ({
  isFullscreen: getFullscreen(state),
});

const getWindowSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

export const Fullscreen = compose(
  withProps(({ ident }) => ({
    ident: ident || defaultIdent,
  })),
  withState('windowSize', 'setWindowSize', getWindowSize()),
  withHandlers({
    windowResizeHandler: ({ setWindowSize }) => debounce(() => {
      setWindowSize(getWindowSize());
    }, 100),
  }),
  connect(mapStateToProps),
  lifecycle({
    componentWillMount() {
      window.addEventListener('resize', this.props.windowResizeHandler);
    },
    componentWillUnmount() {
      window.removeEventListener('resize', this.props.windowResizeHandler);
    },
  }),
)(Component);
