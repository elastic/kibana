import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { ElasticAgentName } from '../../typings';
import { AgentIcon } from '../agent_icon';
import React from 'react';

const serviceOptions: Array<EuiComboBoxOptionOption<ElasticAgentName>> = [
  'go',
  'java',
  'js-base',
  'iOS/swift',
  'rum-js',
  'nodejs',
  'python',
  'dotnet',
  'ruby',
  'php',
  'android/java',
].map((agentName) => ({
  key: agentName,
  label: agentName,
  value: agentName as ElasticAgentName,
}));

interface Props {
  onChange: (selectItem: ElasticAgentName) => void;
  value?: ElasticAgentName;
}
export function ServiceSelector({ onChange, value }: Props) {
  const selectedOption = value && serviceOptions.find((item) => item.key === value);

  return (
    <EuiComboBox
      placeholder="Select a single option"
      singleSelection={{ asPlainText: true }}
      options={serviceOptions}
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
