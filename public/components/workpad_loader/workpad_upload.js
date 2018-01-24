import React from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { getId } from '../../lib/get_id';

export class WorkpadUpload extends React.PureComponent {
  static propTypes = {
    children: PropTypes.node.isRequired,
    onUpload: PropTypes.func.isRequired,
  };

  state = {
    dropping: false,
  };

  setDropping = dropState => this.setState({ dropping: dropState });

  onDrop = files => {
    // TODO: Clean up this file, this loading stuff can, and should be, abstracted
    const reader = new FileReader();

    // handle reading the uploaded file
    reader.onload = () => {
      // TODO: Handle JSON parsing errors
      const workpad = JSON.parse(reader.result);
      workpad.id = getId('workpad');
      this.props.onUpload(workpad);
      this.setDropping(false);
    };

    // read the uploaded file
    reader.readAsText(files[0]);
  };

  render() {
    return (
      <Dropzone
        accept="application/json"
        onDrop={this.onDrop}
        onDragEnter={() => this.setDropping(true)}
        onDragLeave={() => this.setDropping(false)}
        disableClick
        style={{ border: this.state.dropping ? '2px dashed' : '2px solid transparent' }}
      >
        <center>
          <p>
            <i>
              Tip: Drag and drop a <code>JSON</code> exported workpad into this dialog to load new
              workpad from a file
            </i>
          </p>
        </center>

        {this.props.children}
      </Dropzone>
    );
  }
}
