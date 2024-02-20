/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { Controller, FormProvider, useForm } from 'react-hook-form';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';

import { i18n } from '@kbn/i18n';
import { useChat } from '@elastic/ai-assist/dist/react';

import { AIPlaygroundPluginStartDeps, ChatForm, ChatFormFields, MessageRole } from '../types';

import { ChatForm, ChatFormFields, MessageRole } from '../types';
import { MessageList } from './message_list/message_list';
import { QuestionInput } from './question_input';

import { TelegramIcon } from './telegram_icon';
import { transformFromChatMessages } from '../utils/transformToMessages';
import { ChatSidebar } from '@kbn/ai-playground/components/chat_sidebar';

export const Chat = () => {
  const { euiTheme } = useEuiTheme();
  const form = useForm<ChatForm>();
  const {
    control,
    watch,
    formState: { isValid, isSubmitting },
    resetField,
    handleSubmit,
  } = form;
  const { messages, append, stop: stopRequest } = useChat();
  const selectedIndicesCount = watch(ChatFormFields.indices, []).length;

  const onSubmit = async (data: ChatForm) => {
    await append(
      { content: data.question, role: 'human', createdAt: new Date() },
      {
        data: {
          prompt: data[ChatFormFields.prompt],
          indices: data[ChatFormFields.indices].join(),
          api_key: data[ChatFormFields.openAIKey],
          citations: data[ChatFormFields.citations].toString(),
        },
      }
    );

    resetField(ChatFormFields.question);
  };
  const chatMessages = useMemo(
    () => [
      {
        id: uuidv4(),
        role: MessageRole.system,
        content: 'You can start chat now',
      },
      ...transformFromChatMessages(messages),
    ],
    [messages]
  );

  return (
    <FormProvider {...form}>
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
              paddingTop: euiTheme.size.l,
              paddingBottom: euiTheme.size.l,
            }}
          >
            <EuiFlexGroup direction="column" className="eui-fullHeight">
              {/* // Set scroll at the border of parent element*/}
              <EuiFlexItem
                grow={1}
                className="eui-yScroll"
                css={{ paddingLeft: euiTheme.size.l, paddingRight: euiTheme.size.l }}
                tabIndex={0}
              >
                <MessageList messages={chatMessages} />
              </EuiFlexItem>

              <EuiFlexItem
                grow={false}
                css={{ paddingLeft: euiTheme.size.l, paddingRight: euiTheme.size.l }}
              >
                <EuiHorizontalRule margin="none" />

                <EuiSpacer size="m" />

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

          <EuiFlexItem grow={1}>
            <ChatSidebar selectedIndicesCount={selectedIndicesCount} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </FormProvider>
  );
};
