import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

import Positionable from 'plugins/rework/components/positionable/positionable';
import Element from 'plugins/rework/components/element/element';

import { elementSelect, elementProps, elementRemove, argumentSet } from 'plugins/rework/state/actions/element';
import { filterSet } from 'plugins/rework/state/actions/filter';

class ElementWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filterId: `filter-${props.element.id}`
    };
  }

  select(id) {
    return (e) => {
      e.stopPropagation();
      const {dispatch} = this.props;
      dispatch(elementSelect(id));
    };
  }

  handleKeypress(e) {
    const {dispatch, element, page} = this.props;
    if (e.keyCode === 8 || e.keyCode === 46) {
      dispatch(elementRemove(element.id, page.id));
    }
  }

  resizeMove(id) {
    return (e) => {
      const {dispatch} = this.props;
      const {top, left, height, width} = e.interaction.absolute;

      dispatch(elementProps(id, {top, left, height, width}));
    };
  }

  rotate(id) {
    return (e) => {
      const {dispatch} = this.props;
      const {angle} = e.interaction.absolute;
      dispatch(elementProps(id, {angle}));
    };
  }

  setArg(arg, value) {
    const {element, dispatch} = this.props;
    if (_.isEqual(element.args[arg], value)) return;
    this.props.dispatch(argumentSet(this.props.element.id, arg, value));
  }

  setFilter(filterId) {
    return (filter) => this.props.dispatch(filterSet(filterId, filter));
  }

  componentWillUnmount() {
    this.props.dispatch(filterSet(this.state.filterId, undefined));
  }

  render() {
    const {id} = this.props.element;

    const position = _.pick(this.props.element, ['top', 'left', 'height', 'width', 'angle']);
    return (
      <div
        style={{height: '100%'}}
        tabIndex="0"
        onFocus={this.select(id)}
        id={id}
        onKeyDown={this.handleKeypress.bind(this)}
        className="rework--element-wrapper">
        <Positionable style={{zIndex: 2000 + this.props.layer}}
          position={position}
          interact={(this.props.fullscreen || !this.props.editor) ? false : true}
          move={this.resizeMove(id).bind(this)}
          resize={this.resizeMove(id).bind(this)}
          rotate={this.rotate(id).bind(this)}>
            <Element
              type={this.props.element.type}
              args={this.props.elementCache[id]}
              filter={_.get(this.props.filters, this.state.filterId)}
              setArg={this.setArg.bind(this)}
              setFilter={this.setFilter(this.state.filterId).bind(this)}>
            </Element>
        </Positionable>
      </div>
    );
  }
};

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
