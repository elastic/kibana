import React from 'react';
import PropTypes from 'prop-types';

export class FileUpload extends React.PureComponent {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    onUpload: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
  };

  static defaultProps = {
    id: '',
    className: 'canvas__file-upload',
  };

  state = {
    isHovered: false,
  };

  // track enter count since enter/leave fires with each child node you drag over
  _enterCount = 0;

  uploadPrompt = ev => {
    ev.preventDefault();
    this.fileInput.click();
  };

  onDrag = type => ev => {
    ev.preventDefault();
    this._enterCount = type === 'enter' ? this._enterCount + 1 : this._enterCount - 1;
    this.setState({ isHovered: this._enterCount > 0 });
  };

  onDragOver = ev => {
    // enables the onDrop handler, see https://developer.mozilla.org/en-US/docs/Web/Events/drop#Example
    ev.preventDefault();
  };

  onDrop = ev => {
    ev.preventDefault();
    this._enterCount = 0;
    this.setState({ isHovered: false });

    this.props.onUpload({
      files: ev.dataTransfer.files,
    });
  };

  onUpload = ev => {
    ev.preventDefault();
    this.props.onUpload({
      files: ev.target.files,
    });
  };

  render() {
    const { id, className, children } = this.props;

    return (
      <div
        id={id}
        className={className}
        onDragEnter={this.onDrag('enter')}
        onDragLeave={this.onDrag('leave')}
        onDragOver={this.onDragOver}
        onDrop={this.onDrop}
      >
        <input
          type="file"
          style={{ display: 'none' }}
          onChange={this.onUpload}
          ref={r => (this.fileInput = r)}
        />
        {children({ uploadPrompt: this.uploadPrompt, isHovered: this.state.isHovered })}
      </div>
    );
  }
}
