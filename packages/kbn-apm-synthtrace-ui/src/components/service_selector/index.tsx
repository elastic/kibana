import React from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { ElasticAgentName, ServiceSelectorSelectedOption } from '../../typings';
import { AgentIcon } from '../agent_icon';

interface Props {
  onChange: (selectItem: ServiceSelectorSelectedOption) => void;
  value?: string;
  options: Array<EuiComboBoxOptionOption<ElasticAgentName>>;
  optionType: 'single' | 'grouped';
}
export function ServiceSelector({ onChange, value, options, optionType }: Props) {
  let selectedOption;

  if (optionType === 'single') {
    selectedOption = value && options.find((item) => item.key === value);
  } else {
    options.forEach((service) => {
      service.options?.forEach((option) => {
        if (option.key === value) {
          selectedOption = option;
        }
      });
    });
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
          onChange(newOptions[0] as ServiceSelectorSelectedOption);
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
                <EuiText>{option.label}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }
      }}
    />
  );
}
