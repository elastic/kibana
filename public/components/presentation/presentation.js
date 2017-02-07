import $ from 'jquery';
import React from 'react';

// Hot keys are managed here so this can be used independent of redux
export default React.createClass({
  componentDidMount() {
    const {onNext, onPrev, onEsc} = this.props;
    $(window).on('keydown.reworkPresentation', (e) => {
      switch (e.keyCode) {
        case 39:
        case 40:
          onNext();
          break;
        case 37:
        case 38:
          onPrev();
          break;
        case 27:
          onEsc();
          break;
        default:
          console.log(e.keyCode);
      }
    });
  },
  componentWillUnmount() {
    $(window).off('keydown.reworkPresentation');
  },
  handleKey(e) {
    console.log(e.key);
  },
  render() {
    const style = {
      width: '100%',
      height: '100%',
    };

    return (
      <div style={style}>
        {this.props.children}
      </div>
    );
  }
});
