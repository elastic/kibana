import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiImage } from '@elastic/eui';
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
    resolvedArgValue: PropTypes.string,
  };

  state = {
    loading: false,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  // keep track of whether or not the component is mounted, to prevent rogue setState calls
  _isMounted = true;

  handleUpload = files => {
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
    const { resolvedArgValue } = this.props;
    const isLoading = this.state.loading;
    const isDataUrl = resolvedArgValue && isValid(resolvedArgValue);

    const previewImage = isDataUrl && (
      <EuiImage
        size="s"
        hasShadow
        allowFullScreen
        alt="Image Preview"
        url={resolvedArgValue}
        className="canvas__checkered"
      />
    );

    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" className="canvas__argtype--image">
        <EuiFlexItem grow={8}>
          {isLoading ? (
            <Loading animated text="Image uploading" />
          ) : (
            <FileUpload onUpload={this.handleUpload} />
          )}
        </EuiFlexItem>
        {previewImage && (
          <EuiFlexItem grow={3} className="canvas__argtype--image--preview">
            {previewImage}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
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
