import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl, Button, ButtonToolbar } from 'react-bootstrap';
import { getCompletionProposals } from '../../lib/completion_proposals';
import './expression.less';


export const Expression = ({ formState, updateValue, setExpression, done, error }) => {
  let input;
  let completionProposals = [];

  // Automatically add closing brackets and quotes
  function closePairs(event) {
    const pairs = ['()', '[]', '{}', `''`, '""'];
    const openers = pairs.map(pair => pair[0]);
    const closers = pairs.map(pair => pair[1]);

    const { key } = event;
    const { selectionEnd, value } = input;

    if (closers.includes(key) && value.charAt(selectionEnd) === key) {
      // Don't insert the closer, but do move the cursor forward
      event.preventDefault();
      input.setSelectionRange(selectionEnd + 1, selectionEnd + 1);
    } else if (openers.includes(key)) {
      // Insert the opener and the closer and move the cursor forward
      event.preventDefault();
      input.value = value.substr(0, selectionEnd) + key + closers[openers.indexOf(key)] + value.substr(selectionEnd);
      input.setSelectionRange(selectionEnd + 1, selectionEnd + 1);
    } else if (key === 'Backspace' && !event.metaKey && pairs.includes(value.substr(selectionEnd - 1, 2))) {
      // Remove the opener and the closer and move the cursor backward
      event.preventDefault();
      input.value = value.substr(0, selectionEnd - 1) + value.substr(selectionEnd + 1);
      input.setSelectionRange(selectionEnd - 1, selectionEnd - 1);
    }
  }

  function updateCompletionProposals() {
    const { selectionEnd, value } = input;
    completionProposals = getCompletionProposals(value, selectionEnd);
    console.log(completionProposals);
    // completionProposals.length && acceptCompletionProposal(completionProposals[0]);
  }

  function acceptCompletionProposal(proposal) {
    const { value } = input;
    const { start, end, cursor, text } = proposal;
    input.value = value.substr(0, start) + text + value.substr(end);
    input.setSelectionRange(cursor, cursor);
  }

  return (
    <div className="canvas__expression">
      <FormGroup controlId="formControlsTextarea" validationState={error ? 'error' : null}>
        <FormControl
          spellCheck={false}
          componentClass="textarea"
          placeholder="Enter expression..."
          inputRef={ref => input = ref}
          onChange={updateValue}
          onKeyDown={closePairs}
          onKeyUp={updateCompletionProposals}
          value={formState.expression}
        />
        <label>
          { error ? error : `The Canvas expression backing the element. Better know what you're doing here.`}
        </label>
      </FormGroup>
      <ButtonToolbar>
        <Button disabled={!!error} bsStyle="success" onClick={() => setExpression(input.value)}> Run</Button>
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
  done: PropTypes.func,
  error: PropTypes.string,
};
