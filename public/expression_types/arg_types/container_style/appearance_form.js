import React from 'react';
import PropTypes from 'prop-types';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';

const opacities = [
  { value: 1, text: '100%' },
  { value: 0.9, text: '90%' },
  { value: 0.7, text: '70%' },
  { value: 0.5, text: '50%' },
  { value: 0.3, text: '30%' },
  { value: 0.1, text: '10%' },
];

export const AppearanceForm = ({ padding, opacity, onChange }) => {
  const paddingVal = padding ? padding.replace('px', '') : '';

  const namedChange = name => ev => {
    if (name === 'padding') return onChange(name, `${ev.target.value}px`);

    onChange(name, ev.target.value);
  };

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFormRow label="Padding">
          <EuiFieldNumber value={Number(paddingVal)} onChange={namedChange('padding')} />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow label="Opacity">
          <EuiSelect defaultValue={opacity} options={opacities} onChange={namedChange('opacity')} />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AppearanceForm.propTypes = {
  padding: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  opacity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
};
