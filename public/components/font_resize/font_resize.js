import React from 'react';
import _ from 'lodash';
import $ from 'jquery';

/*

  *** READ THIS ***

  This requires that children be inline-block and if you want nice wrapping on paragraph style
  text you're going to need a margin of ~2px. TODO: Fix this. Maybe. You were warned.

*/

export default React.createClass({
  getInitialState() {
    return {};
  },
  componentWillReceiveProps(nextProps) {},
  resize() {
    const {height, width, target} = this.props;

    const outer = $(this.refs.outer);
    const inner = target ? $(target, outer) : $(outer.children()[0]);
    if (inner.height() === 0) return;

    const max = this.props.max || Infinity;

    // Make the font really big
    var fontSize = inner.css('font-size');
    if (_.isString(fontSize)) {
      fontSize = fontSize.match(/[0-9]+/);
      fontSize = Number(fontSize[0]) || 1;
    } else {
      fontSize = 1;
    }

    function getCSS() {
      fontSize = fontSize < 1 ? 1 : fontSize;
      return {'font-size': fontSize + 'px', 'line-height': fontSize + 'px'};
    }

    if (!inner[0]) return;

    function shouldBeBigger() {
      if (width && height) return (inner[0].scrollHeight < outer.height() && inner[0].scrollWidth < outer.width());
      if (height) return (inner[0].scrollHeight < outer.height());
      if (width) return (inner[0].scrollWidth < outer.width());
      return false;
    }

    function shouldBeSmaller() {
      if (width && height) return (inner[0].scrollHeight > outer.height() || inner[0].scrollWidth > outer.width());
      if (height) return (inner[0].scrollHeight > outer.height());
      if (width) return (inner[0].scrollWidth > outer.width());
      return false;
    }

    while (shouldBeBigger() && fontSize <= max) {
      inner.css(getCSS(++fontSize));
    }

    // Ok, now make it just small enough
    while (shouldBeSmaller() && fontSize > 1) {
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
      <div ref="outer" className="rework--font-resize" style={outerStyle}>{children}</div>
    );
  }
});
