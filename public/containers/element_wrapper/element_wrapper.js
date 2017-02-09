import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

import Positionable from 'plugins/rework/components/positionable/positionable';
import Element from 'plugins/rework/components/element/element';

import { elementSelect, elementProps, elementRemove, argumentSet } from 'plugins/rework/state/actions/element';
import { filterSet } from 'plugins/rework/state/actions/filter';

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
  setFilter(filterId) {
    return (filter) => this.props.dispatch(filterSet(filterId, filter));
  },
  render() {
    const {id} = this.props.element;
    const filterId = `filter-${id}`;

    const position = _.pick(this.props.element, ['top', 'left', 'height', 'width', 'angle']);
    return (
      <div
        style={{height: '100%'}}
        tabIndex="0"
        onFocus={this.select(id)}
        id={id}
        onKeyDown={this.handleKeypress}
        className="rework--element-wrapper">
        <Positionable style={{zIndex: 2000 + this.props.layer}}
          position={position}
          interact={(this.props.fullscreen || !this.props.editor) ? false : true}
          move={this.resizeMove(id)}
          resize={this.resizeMove(id)}
          rotate={this.rotate(id)}>
            <Element
              type={this.props.element.type}
              args={this.props.elementCache[id]}
              filter={_.get(this.props.filters, filterId)}
              setArg={this.setArg}
              setFilter={this.setFilter(filterId)}
              getFilter={this.getFilter}>
            </Element>
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
    editor: state.transient.editor,
    filters: state.persistent.filters,
  };
}

export default connect(mapStateToProps)(ElementWrapper);
