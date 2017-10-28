import { connect } from 'react-redux';

import { PanelOptionsMenu } from './panel_options_menu';

import {
  deletePanel,
  destroyEmbeddable
} from '../../actions';

import {
  getEmbeddable,
  getEmbeddableEditUrl,
} from '../../reducers';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return {
    editUrl: embeddable ? getEmbeddableEditUrl(dashboard, panelId) : '',
  };
};

const mapDispatchToProps = (dispatch, { embeddableHandler, panelId }) => ({
  onDeletePanel: () => {
    dispatch(deletePanel(panelId));
    dispatch(destroyEmbeddable(panelId, embeddableHandler));
  }
});

export const PanelOptionsMenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(PanelOptionsMenu);
