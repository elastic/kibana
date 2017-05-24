import { connect } from 'react-redux';
import { compose, withState } from 'recompose';
import { Expression as Component } from './expression';
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
  withState('expression', 'onChange', props => props.expression),
)(Component);
