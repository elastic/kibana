import { isEqual, omit } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

export class TextareaWithSelection extends React.Component {
  componentDidUpdate = () => {
    if (this.input) {
      const { start, end } = this.props.selection;
      this.input.setSelectionRange(start, end);
    }
  }

  onMouseDown = (e) => {
    this.updateSelection(e);
    if (this.props.onMouseDown) this.props.onMouseDown(e);
  }

  onMouseUp = (e) => {
    this.updateSelection(e);
    if (this.props.onMouseUp) this.props.onMouseUp(e);
  }

  onKeyDown = (e) => {
    this.updateSelection(e);
    if (this.props.onKeyDown) this.props.onKeyDown(e);
  }

  onKeyUp = (e) => {
    this.updateSelection(e);
    if (this.props.onKeyUp) this.props.onKeyUp(e);
  }

  ref = (input) => {
    this.input = input;
    if (this.props.ref) this.props.ref(input);
  }

  updateSelection = (e) => {
    const { currentTarget } = e;
    const { selectionStart, selectionEnd } = currentTarget;
    const selection = {
      start: selectionStart,
      end: selectionEnd,
    };
    if (!isEqual(selection, this.props.selection)) {
      this.props.onSelectionChange(selection);
    }
  }

  getTextareaProps = () => {
    return omit(this.props, 'selection', 'onSelectionChange');
  }

  render = () => (
    <textarea
      onMouseDown={e => this.onMouseDown(e)}
      onMouseUp={e => this.onMouseUp(e)}
      onKeyDown={e => this.onKeyDown(e)}
      onKeyUp={e => this.onKeyUp(e)}
      ref={input => this.ref(input)}
      {...this.getTextareaProps()}
    />
  )
}

TextareaWithSelection.propTypes = {
  selection: PropTypes.object.isRequired,
  onSelectionChange: PropTypes.func.isRequired,
  onMouseDown: PropTypes.func,
  onMouseUp: PropTypes.func,
  onKeyDown: PropTypes.func,
  onKeyUp: PropTypes.func,
  ref: PropTypes.func,
};
