import { connect } from 'react-redux';
import { getAssets } from '../../state/selectors/assets';
import { removeAsset } from '../../state/actions/assets';
import { AssetManager as Component } from './asset_manager';

const mapStateToProps = state => ({
  assets: Object.values(getAssets(state)), // pull values out of assets object
});

const mapDispatchToProps = {
  removeAsset,
};

export const AssetManager = connect(mapStateToProps, mapDispatchToProps)(Component);
