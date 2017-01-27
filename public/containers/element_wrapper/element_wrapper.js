import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

import Positionable from 'plugins/rework/components/positionable/positionable';
import Element from 'plugins/rework/components/element/element';

import { elementSelect, elementTop, elementLeft, elementHeight,
  elementWidth, elementAngle, elementRemove } from 'plugins/rework/state/actions/element';

const ElementWrapper = React.createClass({
  select(id) {
    return (e) => {
      e.stopPropagation();
      const {dispatch} = this.props;
      dispatch(elementSelect(id));
    };
  },
  handleKeypress(e) {
    const {dispatch, element, page} = this.props;
    if (e.keyCode === 8 || e.keyCode === 46) {
      dispatch(elementRemove(element.id, page.id));
    }
  },
  resizeMove(id) {
    return (e) => {
      const {dispatch} = this.props;
      const {top, left, height, width} = e.interaction.absolute;

      dispatch(elementTop(id, top));
      dispatch(elementLeft(id, left));
      dispatch(elementHeight(id, height));
      dispatch(elementWidth(id, width));
    };
  },
  rotate(id) {
    return (e) => {
      const {dispatch} = this.props;
      const {angle} = e.interaction.absolute;
      dispatch(elementAngle(id, angle));
    };
  },
  render() {
    const {element, page, fullscreen, layer, elementCache} = this.props;
    const {id} = element;
    const position = _.pick(element, ['top', 'left', 'height', 'width', 'angle']);

    return (
      <div
        style={{height: '100%'}}
        tabIndex="0"
        onFocus={this.select(id)}
        id={id}
        onKeyDown={this.handleKeypress}
        className="rework--element-wrapper">
        <Positionable style={{zIndex: 2000 + layer}}
          position={position}
          interact={fullscreen ? false : true}
          move={this.resizeMove(id)}
          resize={this.resizeMove(id)}
          rotate={this.rotate(id)}>
            <Element type={element.type} args={elementCache[id]}></Element>
        </Positionable>
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    elements: state.persistent.elements,
    elementCache: state.transient.elementCache,
    fullscreen: state.transient.fullscreen
  };
}

export default connect(mapStateToProps)(ElementWrapper);
