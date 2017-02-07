import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

import Positionable from 'plugins/rework/components/positionable/positionable';
import Element from 'plugins/rework/components/element/element';

import { elementSelect, elementProps, elementRemove, argumentSet } from 'plugins/rework/state/actions/element';

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

      dispatch(elementProps(id, {top, left, height, width}));
    };
  },
  rotate(id) {
    return (e) => {
      const {dispatch} = this.props;
      const {angle} = e.interaction.absolute;
      dispatch(elementProps(id, {angle}));
    };
  },
  setArg(arg, value) {
    const {element, dispatch} = this.props;
    if (_.isEqual(element.args[arg], value)) return;
    this.props.dispatch(argumentSet(this.props.element.id, arg, value));
  },
  render() {
    const {element, page, fullscreen, editor, layer, elementCache} = this.props;
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
          interact={(fullscreen || !editor) ? false : true}
          move={this.resizeMove(id)}
          resize={this.resizeMove(id)}
          rotate={this.rotate(id)}>
            <Element type={element.type} args={elementCache[id]} setArg={this.setArg}></Element>
        </Positionable>
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    elements: state.persistent.elements,
    elementCache: state.transient.elementCache,
    fullscreen: state.transient.fullscreen,
    editor: state.transient.editor
  };
}

export default connect(mapStateToProps)(ElementWrapper);
