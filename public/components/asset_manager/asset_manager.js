import React from 'react';
import PropTypes from 'prop-types';
import './asset_manager.less';
import { RemoveIcon } from '../remove_icon';

export const AssetManager = ({ assets, removeAsset }) => {

  return (
    <div className="canvas__asset-manager">
      <div>
        <h3>Manage Workpad Assets</h3>
        <p>
          Below are the image assets you have added to this workpad via image uploads, sorted by when you added them.
          Workpads are limited in size. <strong>You can reclaim space</strong> by deleting assets that you no longer needed.
          Sorry, I can't tell you which assets are currently in use: We're working on that, I promise.
        </p>
        <p>
          I can tell you that the current approximate size of your uncompressed assets
          is <strong>{Math.round(assets.reduce((total, asset) => total + asset.value.length, 0) / 1024)}KB</strong>
        </p>
      </div>

      {assets.map(asset => (
        <div key={asset.id} className="canvas__asset-manager--thumb" style={{
          backgroundImage: `url("${asset.value}")`,
        }}>
          <RemoveIcon style={{ position: 'absolute', top: 0, right: 0 }} onClick={() => removeAsset(asset.id)}/>
        </div>
      ))}
    </div>
  );
};

AssetManager.propTypes = {
  assets: PropTypes.array,
  removeAsset: PropTypes.func,
};
