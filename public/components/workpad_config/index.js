import { connect } from 'react-redux';

import { get } from 'lodash';
import { sizeWorkpad } from '../../state/actions/workpad';
import { getWorkpad } from '../../state/selectors/workpad';


import { WorkpadConfig as Component } from './workpad_config';

const mapStateToProps = (state) => ({
  height: get(getWorkpad(state), 'height'),
  width: get(getWorkpad(state), 'width'),
});

const mapDispatchToProps = ({
  sizeWorkpad,
});

const mergeProps = (stateProps, dispatchProps) => {
  return {
    setSize: (size) => {
      dispatchProps.sizeWorkpad(size);
    },
    size: { height: stateProps.height, width: stateProps.width },
  };
};

export const WorkpadConfig = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
