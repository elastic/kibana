import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose, withState, withProps } from 'recompose';
import { FullscreenControl as Component } from './fullscreen_control';
import { defaultIdent, createHandler } from '../../lib/fullscreen.js';
import { setFullscreen } from '../../state/actions/transient.js';
import { getFullscreen } from '../../state/selectors/app.js';

const mapStateToProps = (state) => ({
  isFullscreen: getFullscreen(state),
});

const mapDispatchToProps = {
  setFullscreen,
};

export const FullscreenControl = compose(
  connect(mapStateToProps, mapDispatchToProps),
  withState('isActive', 'setActive', true),
  withProps(({ ident, isActive }) => ({
    ident: ident || defaultIdent,
    onFullscreen: (ev) => {
      if (!isActive) return;
      const fullscreenHandler = createHandler(ident || defaultIdent);
      fullscreenHandler(ev);
    },
  })),
)(Component);

FullscreenControl.propTypes = {
  ident: PropTypes.string,
};