/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from "react";

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiToolTip
} from "@elastic/eui";

import { i18n } from "@kbn/i18n";

import { OpenAIIcon } from "./open_ai_icon";

const renderSelectOptions = (label: string) => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiIcon type={OpenAIIcon} />
    </EuiFlexItem>
    <EuiFlexItem>
      {label}
    </EuiFlexItem>
  </EuiFlexGroup>
);


enum SummarizationModelName {
  gpt3_5 = 'gpt-3.5-turbo',
  gpt3_5_turbo_1106 = 'gpt-3.5-turbo-1106',
  gpt3_5_turbo_16k = 'gpt-3.5-turbo-16k',
  gpt3_5_turbo_16k_0613 = 'gpt-3.5-turbo-16k-0613',
  gpt3_5_turbo = 'gpt-3.5-turbo-instruct',
}

const Summarization_Model: EuiSuperSelectOption<string>[] = [
  {
    value: SummarizationModelName.gpt3_5,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5),
  },
  {
    value: SummarizationModelName.gpt3_5_turbo_1106,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5_turbo_1106),
  },
  {

    value: SummarizationModelName.gpt3_5_turbo_16k,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5_turbo_16k),
  },
  {
    value: SummarizationModelName.gpt3_5_turbo_16k_0613,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5_turbo_16k_0613),
  },
  {
    value: SummarizationModelName.gpt3_5_turbo,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5_turbo),
  },
];

interface OpenAISummarizationModelProps {
  openAIFlyOutOpen: () => void;
  model: string;
  onSelect: (key: string) => void;
}

export const OpenAISummarizationModel: React.FC<OpenAISummarizationModelProps> = ({ model, onSelect, openAIFlyOutOpen }) => {

  const [selectedModel, setSelectedModel] = useState(model ?? SummarizationModelName.gpt3_5_turbo_1106);

  const onChange = (value: string) => {
    setSelectedModel(value);
    onSelect(value);
  };

  return (
    <EuiFormRow
      label={
        <EuiToolTip
          content={i18n.translate('aiPlayground.sidebar.summarizationModel.help', {
            defaultMessage:
              'The large language model used to summarize your documents.',
          })}
        >
          <>
            <span>
              {i18n.translate('aiPlayground.sidebar.summarizationModel.label', {
                defaultMessage: 'Summarization Model',
              })}
            </span>
            <EuiIcon type="questionInCircle" color="subdued" />
          </>
        </EuiToolTip>
      }
      labelAppend={
        <EuiButtonEmpty flush="both" size="xs" onClick={() => openAIFlyOutOpen()}>
          {i18n.translate('aiPlayground.sidebar.summarizationModel.editLabel', {
            defaultMessage: 'Edit OpenAI API key',
          })}
        </EuiButtonEmpty>
      }
    >
      <EuiSuperSelect
        options={Summarization_Model}
        valueOfSelected={selectedModel}
        onChange={(value) => onChange(value)}
      />
    </EuiFormRow>
  );
};