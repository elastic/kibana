import React from 'react';
import PropTypes from 'prop-types';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiImage, EuiButtonIcon } from '@elastic/eui';
import { ConfirmModal } from '../confirm_modal';
import { RemoveIcon } from '../remove_icon';
import { Clipboard } from '../clipboard';
import { Download } from '../download';

export class AssetManager extends React.PureComponent {
  static propTypes = {
    assets: PropTypes.array,
    removeAsset: PropTypes.func,
  };

  state = {
    deleteId: null,
  };

  doDelete = () => {
    this.resetDelete();
    this.props.removeAsset(this.state.deleteId);
  };

  resetDelete = () => this.setState({ deleteId: null });

  renderAsset = asset => {
    return (
      <EuiPanel
        key={asset.id}
        className="canvas__asset-manager--asset canvas__checkered clickable"
        paddingSize="none"
      >
        <div className="canvas__asset-manager--thumb">
          <EuiImage
            size="m"
            url={asset.value}
            allowFullScreen
            fullScreenIconColor="dark"
            className="canvas__asset-manager--image"
            alt="Asset Thumbnail"
          />
          <EuiFlexGroup
            className="canvas__asset-manager--asset-identifier"
            gutterSize="none"
            alignItems="baseline"
          >
            <EuiFlexItem className="asset-id" grow={false}>
              {asset.id}
            </EuiFlexItem>
            <EuiFlexItem className="asset-download" title="Download" grow={false}>
              <Download fileName={asset.id} content={asset.value}>
                <EuiButtonIcon iconType="exportAction" color="ghost" aria-label="Download" />
              </Download>
            </EuiFlexItem>
            <EuiFlexItem title="Copy to Clipboard" grow={false}>
              <Clipboard content={asset.id}>
                <EuiButtonIcon
                  iconType="copyClipboard"
                  color="ghost"
                  aria-label="Copy to Clipboard"
                />
              </Clipboard>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        <RemoveIcon
          style={{ position: 'absolute', top: -12, right: -12 }}
          onClick={() => this.setState({ deleteId: asset.id })}
        />
      </EuiPanel>
    );
  };

  render() {
    return (
      <div className="canvas__asset-manager">
        <div>
          <h3>Manage Workpad Assets</h3>
          <p>
            Below are the image assets you have added to this workpad via image uploads, sorted by
            when you added them. Workpads are limited in size.{' '}
            <strong>You can reclaim space</strong> by deleting assets that you no longer needed.
            Sorry, I can't tell you which assets are currently in use: We're working on that, I
            promise.
          </p>
          <p>
            I can tell you that the current approximate size of your uncompressed assets is{' '}
            <strong>
              {Math.round(
                this.props.assets.reduce((total, asset) => total + asset.value.length, 0) / 1024
              )}KB
            </strong>
          </p>
        </div>
        {this.props.assets.map(this.renderAsset)}

        <ConfirmModal
          isOpen={this.state.deleteId != null}
          title="Remove Asset"
          message="Are you sure you want to remove this asset?"
          confirmButtonText="Remove"
          onConfirm={this.doDelete}
          onCancel={this.resetDelete}
        />
      </div>
    );
  }
}
