import { connect } from 'react-redux';
import { compose, withState, withHandlers, lifecycle } from 'recompose';
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

  if (!element) return Object.assign({}, ownProps, stateProps, dispatchProps);

  const { expression } = element;

  return Object.assign({}, ownProps, stateProps, dispatchProps, {
    expression,
    setExpression: (exp) => dispatchProps.setExpression({ expression: exp, element, pageId }),
  });
};

const expressionLifecycle = lifecycle({
  componentWillReceiveProps({ formState, setFormState, expression }) {
    if (this.props.expression !== expression && expression !== formState.expression) setFormState({ expression, dirty: false });
  },
});

export const Expression = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withState('formState', 'setFormState', ({ expression }) => ({
    expression,
    dirty: false,
  })),
  withHandlers({
    updateValue: ({ setFormState }) => ev => {
      setFormState({ expression: ev.target.value, dirty: true });
    },
    setExpression: ({ setExpression, setFormState }) => exp => {
      setFormState((prev) => ({ ...prev, dirty: false }));
      setExpression(exp);
    },
  }),
  expressionLifecycle,
)(Component);
