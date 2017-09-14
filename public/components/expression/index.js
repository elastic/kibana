import { connect } from 'react-redux';
import { compose, withState, withHandlers, lifecycle, withPropsOnChange } from 'recompose';
import { Expression as Component } from './expression';
import { getSelectedPage, getSelectedElement } from '../../state/selectors/workpad';
import { setExpression, flushContext } from '../../state/actions/elements';
import { fromExpression } from '../../../common/lib/ast';

const mapStateToProps = (state) => ({
  pageId: getSelectedPage(state),
  element: getSelectedElement(state),
});

const mapDispatchToProps = (dispatch) => ({
  setExpression: (elementId, pageId) => (expression) => {
    // destroy the context cache
    dispatch(flushContext(elementId));

    // update the element's expression
    dispatch(setExpression(expression, elementId, pageId));
  },
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId } = stateProps;

  if (!element) return Object.assign({}, ownProps, stateProps, dispatchProps);

  const { expression } = element;

  return Object.assign({}, ownProps, stateProps, dispatchProps, {
    expression,
    setExpression: dispatchProps.setExpression(element.id, pageId),
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
  withPropsOnChange(['formState'], ({ formState }) => ({
    error: (function () {
      try {
        // TODO: We should merge the advanced UI input and this into a single validated expression input.
        fromExpression(formState.expression);
        return undefined;
      } catch (e) {
        return e.message;
      }
    }()),
  })),
)(Component);
