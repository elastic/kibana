import _ from 'lodash';
import { connect } from 'react-redux';
import { compose, withState, withHandlers, lifecycle, withPropsOnChange, branch, renderComponent } from 'recompose';
import { Expression as Component } from './expression';
import { getSelectedPage, getSelectedElement } from '../../state/selectors/workpad';
import { setExpression, flushContext } from '../../state/actions/elements';
import { ElementNotSelected } from './element_not_selected';
import { fromExpression } from '../../../common/lib/ast';
import { autocompletePairs } from '../../lib/autocomplete_pairs';
import { getAutocompleteProposals } from '../../lib/autocomplete_proposals';

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
    if (this.props.expression !== expression && expression !== formState.expression) {
      setFormState({
        ...formState,
        expression,
        dirty: false,
      });
    }
  },
  componentDidUpdate() {
    const { inputRef, formState } = this.props;
    if (inputRef) {
      const { start, end } = formState.selection;
      inputRef.setSelectionRange(start, end);
    }
  },
});

export const Expression = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withState('formState', 'setFormState', ({ expression }) => ({
    expression,
    selection: {
      start: expression.length,
      end: expression.length,
    },
    dirty: false,
  })),
  withState('inputRef', 'setInputRef'),
  withState('selectedIndex', 'setSelectedIndex', -1),
  withState('showAutocompleteProposals', 'setShowAutocompleteProposals', false),
  withHandlers({
    updateValue: ({ setFormState }) => ev => {
      const { target: { value, selectionStart, selectionEnd } } = ev;
      setFormState({
        expression: value,
        selection: {
          start: selectionStart,
          end: selectionEnd,
        },
        dirty: true,
      });
    },
    updateSelection: ({ formState, setFormState }) => ev => {
      if (ev.target.selectionStart != null) {
        const { target: { selectionStart, selectionEnd } } = ev;
        setFormState({
          ...formState,
          selection: {
            start: selectionStart,
            end: selectionEnd,
          },
        });
      }
    },
    setExpression: ({ setExpression, setFormState }) => exp => {
      setFormState((prev) => ({
        ...prev,
        dirty: false,
      }));
      setExpression(exp);
    },
    acceptAutocompleteProposal: ({ formState, setFormState, setSelectedIndex }) => proposal => {
      const { expression } = formState;
      const { value, location: { start, end } } = proposal;
      setFormState({
        ...formState,
        expression: expression.substr(0, start) + value + expression.substr(end),
        selection: {
          start: start + value.length,
          end: start + value.length,
        },
        dirty: true,
      });
      setSelectedIndex(-1);
    },
  }),
  expressionLifecycle,
  withPropsOnChange(['formState'], ({ formState }) => ({
    error: (function () {
      try {
        // TODO: We should merge the advanced UI input and this into a single validated expression input.
        fromExpression(formState.expression);
        return null;
      } catch (e) {
        return e.message;
      }
    }()),
    autocompleteProposals: getAutocompleteProposals({
      value: formState.expression,
      selection: formState.selection,
    }),
  })),
  withHandlers({
    onKeyDown: ({
      formState,
      setFormState,
      selectedIndex,
      setSelectedIndex,
      autocompleteProposals,
      acceptAutocompleteProposal,
      showAutocompleteProposals,
      setShowAutocompleteProposals,
      updateSelection,
    }) => event => {
      updateSelection(event);

      // TODO: Move this into a separate HOC for handling typeahead stuff
      const { key } = event;
      if (key === 'ArrowUp' && showAutocompleteProposals && autocompleteProposals.length) {
        event.preventDefault();
        setSelectedIndex((selectedIndex || autocompleteProposals.length) - 1);
      } else if (key === 'ArrowDown' && showAutocompleteProposals && autocompleteProposals.length) {
        event.preventDefault();
        setSelectedIndex((selectedIndex + 1) % autocompleteProposals.length);
      } else if (key === 'Enter' && selectedIndex >= 0 && showAutocompleteProposals && autocompleteProposals.length) {
        event.preventDefault();
        acceptAutocompleteProposal(autocompleteProposals[selectedIndex]);
      } else if (key === 'Escape') {
        setShowAutocompleteProposals(false);
      } else {
        setShowAutocompleteProposals(true);
        setSelectedIndex(-1);
        const { value, selection } = autocompletePairs(formState.expression, formState.selection, event.key);
        if (value !== formState.expression || !_.isEqual(selection, formState.selection)) {
          event.preventDefault();
          setFormState({
            expression: value,
            selection: selection,
            dirty: true,
          });
        }
      }
    },
  }),
  branch(props => !props.element, renderComponent(ElementNotSelected)),
)(Component);
