import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Button } from 'react-bootstrap';
import { Loading } from '../../../components/loading';
import { FileUpload } from '../../../components/file_upload';
import { encode, isValid } from '../../../../common/lib/dataurl';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import './image_upload.less';

class ImageUpload extends React.Component {
  static propTypes = {
    onAssetAdd: PropTypes.func.isRequired,
    onValueChange: PropTypes.func.isRequired,
    typeInstance: PropTypes.object.isRequired,
    resolvedArgValue: PropTypes.shape({
      type: PropTypes.string,
      value: PropTypes.string,
    }),
  };

  state = {
    loading: false,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  // keep track of whether or not the component is mounted, to prevent rogue setState calls
  _isMounted = true;

  handleUpload = ({ files }) => {
    const { onAssetAdd, onValueChange } = this.props;
    const [upload] = files;
    this.setState({ loading: true }); // start loading indicator

    encode(upload)
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
    const { typeInstance, resolvedArgValue } = this.props;
    const isLoading = this.state.loading;
    const isDataUrl =
      resolvedArgValue && resolvedArgValue.type === 'dataurl' && isValid(resolvedArgValue.value);

    const previewImage = isDataUrl && (
      <img
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${resolvedArgValue.value})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'contain',
        }}
      />
    );

    return (
      <FormGroup key={typeInstance.name} controlId="formControlsSelect">
        <div className="canvas__argtype--image">
          <div className="canvas__argtype--image--control">
            {isLoading ? (
              <Loading animated text="Image uploading" />
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
          </div>
          <div className="canvas__argtype--image--preview">{previewImage}</div>
        </div>
      </FormGroup>
    );
  }
}

export const imageUpload = () => ({
  name: 'imageUpload',
  displayName: 'Image Upload',
  help: 'Select or upload an image',
  resolveArgValue: true,
  template: templateFromReactComponent(ImageUpload),
});
