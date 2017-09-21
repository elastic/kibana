import { connect } from 'react-redux';
import { getAssets } from '../../state/selectors/assets';
import { removeAsset } from '../../state/actions/assets';

//import { addColor, removeColor } from '../../state/actions/workpad';
import { map } from 'lodash';

import { AssetManager as Component } from './asset_manager';

const mapStateToProps = (state) => ({
  assets: map(getAssets(state), asset => asset),
});

const mapDispatchToProps = ({
  removeAsset,
});

export const AssetManager = connect(mapStateToProps, mapDispatchToProps)(Component);
