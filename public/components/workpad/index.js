import { connect } from 'react-redux';
import { Workpad as Component } from './workpad';
import { getElements } from '../../state/selectors/workpad';

const mapStateToProps = (state) => {
  return {
    elements: getElements(state),
  };
};

export const Workpad = connect(mapStateToProps)(Component);
