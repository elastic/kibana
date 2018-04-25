import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Button } from 'react-bootstrap';
import { FileUpload } from '../../components/file_upload';
import { encode } from '../../../common/lib/dataurl';
import { templateFromReactComponent } from '../../lib/template_from_react_component';

class ImageUpload extends React.Component {
  static propTypes = {
    onAssetAdd: PropTypes.func.isRequired,
    onValueChange: PropTypes.func.isRequired,
    typeInstance: PropTypes.object.isRequired,
  };

  state = {
    loading: false,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  _isMounted = true;

  handleUpload = ({ files }) => {
    const { onAssetAdd, onValueChange } = this.props;
    const [upload] = files;
    this.setState({ loading: true }); // start loading indicator

    return encode(upload)
      .then(dataurl => onAssetAdd('dataurl', dataurl))
      .then(assetId => {
        onValueChange({
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'asset',
              arguments: {
                _: [assetId],
              },
            },
          ],
        });

        // this component can go away when onValueChange is called, check for _isMounted
        this._isMounted && this.setState({ loading: false }); // set loading state back to false
      });
  };

  render() {
    const { typeInstance } = this.props;
    const isLoading = this.state.loading;

    return (
      <FormGroup key={typeInstance.name} controlId="formControlsSelect">
        {isLoading ? (
          <span>
            Image uploading <span className="fa fa-spinner fa-pulse" />
          </span>
        ) : (
          <FileUpload onUpload={this.handleUpload}>
            {({ uploadPrompt, isHovered }) => (
              <Button
                bsStyle={isHovered ? 'info' : 'default'}
                bsSize="small"
                onClick={uploadPrompt}
              >
                {isHovered ? 'Drop to Upload Image' : 'Upload New Image'}
              </Button>
            )}
          </FileUpload>
        )}
      </FormGroup>
    );
  }
}

export const imageUpload = () => ({
  name: 'imageUpload',
  displayName: 'Image Upload',
  help: 'Select or upload an image',
  template: templateFromReactComponent(ImageUpload),
});
