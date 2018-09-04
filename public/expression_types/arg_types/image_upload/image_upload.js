import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiSelect,
  EuiButton,
  EuiFieldText,
} from '@elastic/eui';
import { elasticOutline } from '../../../../common/functions/repeatImage/elastic_outline';
import { resolveFromArgs } from '../../../../common/lib/resolve_dataurl';
import { Loading } from '../../../components/loading';
import { FileUpload } from '../../../components/file_upload';
import { isValid as isValidHttpUrl } from '../../../../common/lib/httpurl';
import { encode, isValid as isValidDataUrl } from '../../../../common/lib/dataurl';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';

class ImageUpload extends React.Component {
  static propTypes = {
    onAssetAdd: PropTypes.func.isRequired,
    onValueChange: PropTypes.func.isRequired,
    typeInstance: PropTypes.object.isRequired,
    resolvedArgValue: PropTypes.string,
  };

  constructor(props) {
    super(props);

    const url = this.props.resolvedArgValue || null;
    const urlType = isValidHttpUrl(url) ? 'src' : 'inline'; // if not a valid base64 string, will show as missing asset icon

    this.inputRefs = {};

    this.state = {
      loading: false,
      url, // what to show in preview / paste url text input
      urlType, // what panel to show, fileupload or paste url
    };
  }

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

  changeUrlType = ({ target = {} }) => {
    this.setState({ urlType: target.value });
  };

  setSrcUrl = () => {
    const { value: srcUrl } = this.inputRefs.srcUrlText;
    this.setState({ url: srcUrl });

    const { onValueChange } = this.props;
    onValueChange(srcUrl);
  };

  urlTypeOptions = [
    { value: 'inline', text: 'Upload Image' },
    { value: 'src', text: 'Paste Image URL' },
  ];

  render() {
    const { loading, url, urlType } = this.state;
    const urlTypeInline = urlType === 'inline';
    const urlTypeSrc = urlType === 'src';

    const selectUrlType = (
      <EuiSelect
        compressed
        options={this.urlTypeOptions}
        defaultValue={urlType}
        onChange={this.changeUrlType}
      />
    );

    let uploadImage = null;
    if (urlTypeInline) {
      uploadImage = loading ? (
        <Loading animated text="Image uploading" />
      ) : (
        <FileUpload onUpload={this.handleUpload} />
      );
    }

    const pasteImageUrl = urlTypeSrc ? (
      <form onSubmit={this.setSrcUrl} className="eui-textRight">
        <EuiFieldText
          compressed
          defaultValue={this.state.url}
          inputRef={ref => (this.inputRefs.srcUrlText = ref)}
          placeholder="Image URL"
          aria-label="Image URL"
        />
        <EuiButton type="submit" size="s" onClick={this.setSrcUrl}>
          Set
        </EuiButton>
      </form>
    ) : null;

    const shouldPreview =
      (urlTypeSrc && isValidHttpUrl(url)) || (urlTypeInline && isValidDataUrl(url));

    return (
      <div>
        {selectUrlType}
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" className="canvasArgImage">
          <EuiFlexItem grow={8}>
            {uploadImage}
            {pasteImageUrl}
          </EuiFlexItem>
          {shouldPreview ? (
            <EuiFlexItem grow={3} className="canvasArgImage--preview">
              <EuiImage
                size="s"
                hasShadow
                alt="Image Preview"
                url={this.state.url}
                className="canvasCheckered"
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </div>
    );
  }
}

export const imageUpload = () => ({
  name: 'imageUpload',
  displayName: 'Image Upload',
  help: 'Select or upload an image',
  resolveArgValue: true,
  template: templateFromReactComponent(ImageUpload),
  resolve({ args }) {
    return { dataurl: resolveFromArgs(args, elasticOutline) };
  },
});
