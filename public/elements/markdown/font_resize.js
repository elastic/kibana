import React from 'react';
import _ from 'lodash';
import $ from 'jquery';

// Must have value & onDone, onChange is optional. If no onChange is specificed this will maintain
// internal state, which, if something else changes your value, could get dicey

export default React.createClass({
  getInitialState() {
    return {};
  },
  componentWillReceiveProps(nextProps) {},
  resize() {
    const outer = $(this.refs.outer);
    const inner = $(outer.children()[0]);
    if (inner.height() === 0) return;

    // Make the font really big
    var fontSize = inner.css('font-size').match(/[0-9]+/);

    if (!fontSize.length) return;

    fontSize = Number(fontSize[0]);

    function getCSS() {
      fontSize = fontSize < 1 ? 1 : fontSize;
      return {'font-size': fontSize + 'px', 'line-height': fontSize + 'px'};
    }

    while (inner[0].scrollHeight < outer.height() && fontSize <= '100') {
      inner.css(getCSS(++fontSize));
    }

    // Ok, now make it just small enough
    while (inner[0].scrollHeight > outer.height() && fontSize > 1) {
      inner.css(getCSS(--fontSize));
    }
  },
  componentDidUpdate() {
    this.resize();
  },
  componentDidMount() {
    this.resize();
  },
  render() {
    const {children} = this.props;
    const outerStyle = {
      height: '100%',
      width: '100%'
    };

    return (
      <div ref="outer" style={outerStyle}>{children}</div>
    );
  }
});
