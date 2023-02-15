import React from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { ElasticAgentName } from '../../typings';
import { AgentIcon } from '../agent_icon';

interface Props {
  onChange: (selectItem: ElasticAgentName) => void;
  value?: ElasticAgentName;
  options: Array<EuiComboBoxOptionOption<ElasticAgentName>>;
  optionType: 'single' | 'grouped';
}
export function ServiceSelector({ onChange, value, options, optionType }: Props) {
  let selectedOption;

  if (optionType === 'single') {
    selectedOption = value && options.find((item) => item.key === value);
  } else {
    selectedOption =
      value && options.flatMap((item) => item.options?.find((option) => option.key === value))[0];
  }

  return (
    <EuiComboBox
      placeholder="Select a single option"
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOption ? [selectedOption] : []}
      isClearable={false}
      onChange={(newOptions) => {
        if (newOptions[0].value) {
          onChange(newOptions[0].value);
        }
      }}
      renderOption={(option) => {
        if (option.value) {
          return (
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <AgentIcon agentName={option.value} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>{option.value}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }
      }}
    />
  );
}
