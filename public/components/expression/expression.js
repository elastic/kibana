import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl, Button, ButtonToolbar } from 'react-bootstrap';
import './expression.less';

function getOffsetTop({ expression, selection: { start } }) {
  return expression.substr(0, start).split('\n').length * 22 + 8;
}

export const Expression = ({
  formState,
  updateValue,
  setExpression,
  setInputRef,
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
          <FormControl
            spellCheck={false}
            componentClass="textarea"
            placeholder="Enter expression..."
            inputRef={setInputRef}
            onKeyDown={onKeyDown}
            onKeyUp={updateSelection}
            onClick={updateSelection}
            onChange={updateValue}
            value={formState.expression}
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
  setInputRef: PropTypes.func,
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
