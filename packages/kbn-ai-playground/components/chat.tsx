/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Controller, useForm } from 'react-hook-form';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ChatForm, ChatFormFields, MessageRole } from '../types';

import { MessageList } from './message_list/message_list';
import { QuestionInput } from './question_input';
import { OpenAIKey } from './open_ai_key';

import { TelegramIcon } from './telegram_icon';
import { InstructionsField } from '@kbn/ai-playground/components/instructions_field';
import { IncludeCitationsField } from '@kbn/ai-playground/components/include_citations_field';

export const Chat = () => {
  const { euiTheme } = useEuiTheme();
  const {
    control,
    formState: { isValid, isSubmitting },
    resetField,
    handleSubmit,
  } = useForm<ChatForm>();
  const messages = [
    {
      id: 'sfs',
      role: MessageRole.system,
      content: (
        <>
          Added <EuiLink>5 indices</EuiLink> to chat context.
        </>
      ),
    },
    {
      id: 'asaqwas',
      role: MessageRole.assistant,
      createdAt: new Date(),
      content:
        'We went ahead and added your indices. You can start chatting now or modify your sources. For a deeper dive into AI Playground, review our documentation.',
    },
    {
      id: 'asdas',
      role: MessageRole.user,
      createdAt: new Date(),
      content: 'What is the average response time?',
    },
  ];
  const onSubmit = (data: ChatForm) => {
    resetField(ChatFormFields.question);
  };

  return (
    <EuiForm component="form" css={{ display: 'flex' }} onSubmit={handleSubmit(onSubmit)}>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem
          grow={2}
          css={{
            borderRight: euiTheme.border.thin,
            padding: euiTheme.size.l,
          }}
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={1}>
              <MessageList messages={messages} />
            </EuiFlexItem>

            <EuiHorizontalRule margin="none" />

            <EuiFlexItem grow={false}>
              <Controller
                name={ChatFormFields.question}
                control={control}
                defaultValue=""
                rules={{
                  required: true,
                  validate: (rule) => !!rule?.trim(),
                }}
                render={({ field }) => (
                  <QuestionInput
                    value={field.value}
                    onChange={field.onChange}
                    onEnterPress={handleSubmit(onSubmit)}
                    button={
                      <EuiButtonIcon
                        aria-label={i18n.translate('aiPlayground.chat.sendButtonAriaLabel', {
                          defaultMessage: 'Send a question',
                        })}
                        display={isValid ? 'base' : 'empty'}
                        size="s"
                        type="submit"
                        isLoading={isSubmitting}
                        isDisabled={!isValid}
                        iconType={TelegramIcon}
                      />
                    }
                  />
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem
          grow={1}
          css={{
            padding: euiTheme.size.l,
          }}
        >
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
