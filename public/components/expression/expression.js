import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiPanel,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { ExpressionInput } from '../expression_input';

export const Expression = ({ formState, updateValue, setExpression, done, error }) => {
  return (
    <EuiPanel>
      <ExpressionInput error={error} value={formState.expression} onChange={updateValue} />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" color={formState.dirty ? 'danger' : 'primary'} onClick={done}>
            {formState.dirty ? 'Cancel' : 'Close'}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            disabled={!!error}
            onClick={() => setExpression(formState.expression)}
            size="s"
          >
            Run
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

Expression.propTypes = {
  formState: PropTypes.object,
  updateValue: PropTypes.func,
  setExpression: PropTypes.func,
  done: PropTypes.func,
  error: PropTypes.string,
};
