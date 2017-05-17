import { connect } from 'react-redux';
import { flowRight } from 'lodash';
import { Expression as Component } from './expression';
import { statefulInput } from '../../lib/stateful_hoc';
import { getSelectedPage, getSelectedElement } from '../../state/selectors/workpad';
import { setExpression } from '../../state/actions/elements';

const mapStateToProps = (state) => ({
  pageId: getSelectedPage(state),
  element: getSelectedElement(state),
});

const mapDispatchToProps = ({
  setExpression,
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId } = stateProps;
  const { expression } = element;

  return Object.assign({}, ownProps, stateProps, dispatchProps, {
    expression,
    onChange: (exp) => dispatchProps.setExpression({ expression: exp, element, pageId }),
  });
};

export const Expression = flowRight([
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  statefulInput('expression'),
])(Component);
