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
  useEuiTheme,
} from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';

import { i18n } from '@kbn/i18n';
import { useChat, UseChatHelpers } from '@elastic/ai-assist/dist/react';

import {
  AIPlaygroundPluginStartDeps,
  ChatForm,
  ChatFormFields,
  Message,
  MessageRole,
} from '../types';

import { MessageList } from './message_list/message_list';
import { QuestionInput } from './question_input';
import { OpenAIKeyField } from './open_ai_key_field';
import { InstructionsField } from './instructions_field';
import { IncludeCitationsField } from './include_citations_field';

import { TelegramIcon } from './telegram_icon';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';


const transformFromChatMessages = (messages: UseChatHelpers['messages']): Message[] =>
  messages.map(({ id, content, createdAt, role }) => ({
    id,
    content,
    createdAt,
    role: role === 'assistant' ? MessageRole.assistant : MessageRole.user,
  }));

export const Chat = () => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<AIPlaygroundPluginStartDeps>();
  const {
    control,
    formState: { isValid, isSubmitting },
    resetField,
    handleSubmit,
  } = useForm<ChatForm>();
  const {
    messages,
    append,
    stop: stopRequest,
  } = useChat({
    api: async (request: RequestInit) => {
      const response = await services.http.post('/internal/enterprise_search/ai_playground/chat', {
        ...request,
        rawResponse: true,
        asResponse: true,
      });

      return response.response!;
    },
  });

  const { isPending, error, data } = useQuery({
    queryKey: ['repoData'],
    queryFn: () =>
      services.http.post('/internal/enterprise_search/ai_playground/indices_query', {
        body: JSON.stringify({ indices: ['workplace_index'] }),
      }),
  });

  console.log(data)
  
  const onSubmit = async (data: ChatForm) => {
    await append(
      { content: data.question, role: 'human', createdAt: new Date() },
      {
        data: {
          prompt: data[ChatFormFields.prompt],
          indices: 'workplace_index',
          api_key: data[ChatFormFields.openAIKey],
          citations: data[ChatFormFields.citations],
        },
      }
    );

    resetField(ChatFormFields.question);
  };
  const initialMessages = [
    {
      id: uuidv4(),
      role: MessageRole.system,
      content: 'You can start chat now',
    },
  ];

  return (
    <EuiForm
      component="form"
      css={{ display: 'flex', flexGrow: 1 }}
      onSubmit={handleSubmit(onSubmit)}
    >
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
              <MessageList
                messages={[...initialMessages, ...transformFromChatMessages(messages)]}
              />
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
                    isDisabled={isSubmitting}
                    button={
                      isSubmitting ? (
                        <EuiButtonIcon
                          aria-label={i18n.translate('aiPlayground.chat.stopButtonAriaLabel', {
                            defaultMessage: 'Stop request',
                          })}
                          display="base"
                          size="s"
                          iconType="stop"
                          onClick={stopRequest}
                        />
                      ) : (
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
                      )
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
