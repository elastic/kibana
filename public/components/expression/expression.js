import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Button, ButtonToolbar } from 'react-bootstrap';
import './expression.less';
import { TextareaWithSelection } from '../textarea_with_selection';

function getOffsetTop({ expression, selection: { start } }) {
  return expression.substr(0, start).split('\n').length * 22 + 8;
}

export const Expression = ({
  formState,
  updateValue,
  setExpression,
  onKeyDown,
  updateSelection,
  autocompleteProposals,
  acceptAutocompleteProposal,
  showAutocompleteProposals,
  selectedIndex,
  setSelectedIndex,
  done,
  error,
}) => {
  return (
    <div className="canvas__expression">
      <FormGroup controlId="formControlsTextarea" validationState={error ? 'error' : null}>
        <div className="autocomplete">
          <TextareaWithSelection
            spellCheck={false}
            className="textarea form-control"
            selection={formState.selection}
            onSelectionChange={updateSelection}
            value={formState.expression}
            onChange={updateValue}
            onKeyDown={onKeyDown}
          />
          <div
            className={'autocompleteProposals ' + (showAutocompleteProposals ? '' : 'hidden')}
            style={{ top: getOffsetTop(formState) + 'px' }}
          >
            { autocompleteProposals.map((proposal, i) => (
                <div
                  key={i}
                  className={'autocompleteProposal ' + (selectedIndex === i ? 'active' : '')}
                  onClick={() => acceptAutocompleteProposal(proposal)}
                  onMouseOver={() => setSelectedIndex(i)}
                >
                  <div>{proposal.name}</div>
                  <div>{proposal.description}</div>
                </div>
            ))}
          </div>
        </div>
        <label>
          { error ? error : `The Canvas expression backing the element. Better know what you're doing here.`}
        </label>
      </FormGroup>
      <ButtonToolbar>
        <Button disabled={!!error} bsStyle="success" onClick={() => setExpression(formState.expression)}> Run</Button>
        {done ?
          (<Button onClick={done}> {formState.dirty ? 'Cancel' : 'Done'}</Button>)
        : null}
      </ButtonToolbar>
    </div>
  );
};

Expression.propTypes = {
  formState: PropTypes.object,
  updateValue: PropTypes.func,
  setExpression: PropTypes.func,
  onKeyDown: PropTypes.func,
  updateSelection: PropTypes.func,
  autocompleteProposals: PropTypes.array,
  acceptAutocompleteProposal: PropTypes.func,
  showAutocompleteProposals: PropTypes.bool,
  selectedIndex: PropTypes.number,
  setSelectedIndex: PropTypes.func,
  done: PropTypes.func,
  error: PropTypes.string,
};
