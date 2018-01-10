import { connect } from 'react-redux';
import { map } from 'lodash';
import { getAssets } from '../../state/selectors/assets';
import { removeAsset } from '../../state/actions/assets';
import { AssetManager as Component } from './asset_manager';

const mapStateToProps = state => ({
  assets: map(getAssets(state), asset => asset),
});

const mapDispatchToProps = {
  removeAsset,
};

export const AssetManager = connect(mapStateToProps, mapDispatchToProps)(Component);
