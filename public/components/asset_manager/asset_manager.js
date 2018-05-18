import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { ConfirmModal } from '../confirm_modal';
import { RemoveIcon } from '../remove_icon';
import { Clipboard } from '../clipboard';
import { Download } from '../download';
import './asset_manager.less';

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
      <div
        key={asset.id}
        className="canvas__asset-manager--thumb"
        style={{
          backgroundImage: `url("${asset.value}")`,
        }}
      >
        <RemoveIcon
          style={{ position: 'absolute', top: 0, right: 0 }}
          onClick={() => this.setState({ deleteId: asset.id })}
        />
        <div className="canvas__asset-manager--asset-identifier">
          <div className="asset-copy" title="Copy to Clipboard">
            <Clipboard content={asset.id}>
              <Button bsSize="xsmall">
                <span className="fa fa-clipboard" />
              </Button>
            </Clipboard>
          </div>
          <div className="asset-download">
            <Download fileName={asset.id} content={asset.value}>
              <Button bsSize="xsmall" title="Download">
                <span className="fa fa-download" />
              </Button>
            </Download>
          </div>
          <div className="asset-id">{asset.id}</div>
        </div>
      </div>
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
