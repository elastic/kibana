import React from 'react';
import PropTypes from 'prop-types';
import { createListener, canFullscreen } from '../../lib/fullscreen.js';
import { Shortcuts } from 'react-shortcuts';


// TODO: this is a class because this has to use ref, and it seemed best to allow
// multile instances of this component... can we use ref with SFCs?
export class FullscreenControl extends React.PureComponent {
  componentDidMount() {
    // check that the fullscreen api is available, deactivate control if not
    const el = this.node;
    if (!canFullscreen(el)) {
      this.props.setActive(false);
      return;
    }

    // listen for changes to the fullscreen element, update state to match
    this.fullscreenListener = createListener(({ fullscreen, element }) => {
      // if the app is the fullscreen element, set the app state
      if (!element || element.id === this.props.ident) this.props.setFullscreen(fullscreen);
    });
  }

  componentWillUmount() {
    // remove the fullscreen event listener
    this.fullscreenListener && this.fullscreenListener();
  }

  render() {
    const { isActive, children, isFullscreen, onFullscreen } = this.props;
    if (!isActive) return null;

    const keyHandler = (action) => {
      if (action === 'FULLSCREEN') onFullscreen();
    };

    return (
      <span ref={node => this.node = node}>
        {!isFullscreen &&
          <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global isolate />
        }
        {children({ isFullscreen, onFullscreen })}
      </span>
    );
  }
}

FullscreenControl.propTypes = {
  isActive: PropTypes.bool.isRequired,
  setActive: PropTypes.func.isRequired,
  setFullscreen: PropTypes.func.isRequired,
  children: PropTypes.func.isRequired,
  ident: PropTypes.string.isRequired,
  onFullscreen: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.bool,
  ]),
  isFullscreen: PropTypes.bool,
};
