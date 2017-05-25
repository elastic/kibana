import { connect } from 'react-redux';
import { compose } from 'recompose';
import { Expression as Component } from './expression';
import { statefulProp } from '../../lib/stateful_component';
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
    setExpression: (exp) => dispatchProps.setExpression({ expression: exp, element, pageId }),
  });
};

export const Expression = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  statefulProp('expression'),
)(Component);
