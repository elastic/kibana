/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Control, Controller } from 'react-hook-form';
import { ChatForm, ChatFormFields } from '../types';
import { OpenAIKeyField } from './open_ai_key_field';
import { InstructionsField } from './instructions_field';
import { IncludeCitationsField } from './include_citations_field';
import { SourcesPanelSidebar } from './sources_panel/sources_panel_sidebar';
import { IndexName } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

interface ChatSidebarProps {
  control: Control<ChatForm>;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ control }) => {
  const { euiTheme } = useEuiTheme();
  const accordions = [
    {
      id: useGeneratedHtmlId({ prefix: 'summarizationAccordion' }),
      title: i18n.translate('aiPlayground.sidebar.summarizationTitle', {
        defaultMessage: 'Summarization',
      }),
      children: (
        <>
          <Controller
            name={ChatFormFields.openAIKey}
            control={control}
            defaultValue=""
            render={({ field }) => <OpenAIKeyField apiKey={field.value} onSave={field.onChange} />}
          />

          <Controller
            name={ChatFormFields.prompt}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <InstructionsField value={field.value} onChange={field.onChange} />
            )}
          />

          <Controller
            name={ChatFormFields.citations}
            control={control}
            defaultValue={true}
            render={({ field }) => (
              <IncludeCitationsField checked={field.value} onChange={field.onChange} />
            )}
          />
        </>
      ),
    },
    {
      id: useGeneratedHtmlId({ prefix: 'sourcesAccordion' }),
      title: i18n.translate('aiPlayground.sidebar.sourceTitle', { defaultMessage: 'Sources' }),
      children: (
        <Controller
          name={ChatFormFields.indices}
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <SourcesPanelSidebar
              selectedIndices={field.value}
              addIndex={(newIndex: IndexName) => {
                field.onChange([...field.value, newIndex]);
              }}
              removeIndex={(index: IndexName) => {
                field.onChange(field.value.filter((indexName: string) => indexName !== index));
              }}
            />
          )}
        />
      ),
    },
  ];
  const [openAccordionId, setOpenAccordionId] = useState(accordions[0].id);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {accordions.map(({ id, title, children }, index) => (
        <EuiFlexItem
          key={id}
          css={{
            borderBottom: index === accordions.length - 1 ? 'none' : euiTheme.border.thin,
            padding: `0 ${euiTheme.size.l}`,
            flexGrow: openAccordionId === id ? 1 : 0,
            transition: `${euiTheme.animation.normal} ease-in-out`,
          }}
        >
          <EuiAccordion
            id={id}
            buttonContent={
              <EuiTitle size="xs">
                <h5>{title}</h5>
              </EuiTitle>
            }
            buttonProps={{ paddingSize: 'l' }}
            forceState={openAccordionId === id ? 'open' : 'closed'}
            onToggle={() => setOpenAccordionId(openAccordionId === id ? '' : id)}
          >
            {children}
            <EuiSpacer size="l" />
          </EuiAccordion>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
