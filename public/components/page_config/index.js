import { connect } from 'react-redux';

import { get } from 'lodash';
import { getSelectedPageIndex, getPages, getWorkpadColors } from '../../state/selectors/workpad';
import { stylePage } from '../../state/actions/pages';

import { PageConfig as Component } from './page_config';

const mapStateToProps = (state) => ({
  page: getPages(state)[getSelectedPageIndex(state)],
  colors: getWorkpadColors(state),
});

const mapDispatchToProps = ({
  stylePage,
});

const mergeProps = (stateProps, dispatchProps) => {
  return {
    colors: stateProps.colors,
    setBackground: (background) => {
      const itsTheNewStyle = Object.assign({}, stateProps.page.style, { background });
      dispatchProps.stylePage(stateProps.page.id, itsTheNewStyle);
    },
    background: get(stateProps, 'page.style.background'),
  };
};

export const PageConfig = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
