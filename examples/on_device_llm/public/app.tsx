/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ZitherPublicPluginStart } from '@kbn/zither-plugin/public';
import * as webllm from '@mlc-ai/web-llm';
import {
  EuiCallOut,
  EuiLink,
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  EuiButton,
  EuiTextArea,
  EuiDescriptionList,
  EuiBadge,
  EuiToolTip,
  EuiPanel,
  EuiLoadingElastic,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Observable } from 'rxjs';

interface OnDeviceExampleAppProps {
  coreStart: CoreStart;
  zither: ZitherPublicPluginStart;
  logger: Logger;
}

const systemContext: webllm.ChatCompletionSystemMessageParam[] = [
  {
    role: 'system',
    content:
      "Your are a helpful assistant named Ducky, that lives on the user's device running within Kibana. Kibana is a data visualization and exploration tool.",
  },
];

const centeredStyle = {
  alignSelf: 'center',
  height: 'inherit',
};

const useMLCEngine = ({ zither, logger }: Pick<OnDeviceExampleAppProps, 'zither' | 'logger'>) => {
  const zitherStateSubscription = useRef<ReturnType<typeof zither.state.subscribe> | null>(null);
  const [zitherState, setZitherState] =
    useState<ZitherPublicPluginStart['state'] extends Observable<infer V> ? V : null>(null);
  /* *
   * Application configuration for the MLC Engine
   * see {@link https://llm.mlc.ai/docs/deploy/webllm.html here} for information on specifying models
   */
  const appConfig = useRef<webllm.AppConfig>({
    ...webllm.prebuiltAppConfig,
    model_list: ([] as webllm.ModelRecord[]).concat(
      // Valid filter options include; gemma-2, llama, qwen
      webllm.prebuiltAppConfig.model_list.filter((model) => model.model_id.includes('gemma-2'))
    ),
  });
  const mlcEngine =
    useRef<ReturnType<ZitherPublicPluginStart['mlcEngine']> extends Promise<infer V> ? V : never>();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [initializationReport, setInitializationReport] = useState<null | {
    progress: number;
    text: string;
  }>();

  const defaultContext = useRef<webllm.ChatCompletionSystemMessageParam[]>(systemContext);

  useEffect(() => {
    if (!zitherStateSubscription.current) {
      zitherStateSubscription.current = zither.state.subscribe(setZitherState);
    }

    return () => {
      zitherStateSubscription.current?.unsubscribe();
    };
  }, [zither]);

  useEffect(() => {
    const provisionMLCEngine = async () => {
      try {
        mlcEngine.current = await zither.mlcEngine(selectedModelId!, {
          appConfig: appConfig.current,
          initProgressCallback: (report) => {
            logger.debug(`MLC Engine initialization progress: ${report.progress}`);
            setInitializationReport(report);
          },
          logLevel: 'TRACE',
        });
      } catch (err) {
        logger.error(`MLC Engine initialization error: ${err.toString()}`);
      }
    };

    if (zitherState === 'activated' && selectedModelId && !mlcEngine.current) {
      logger.info('Initializing MLC Engine...');
      // provision or reload the MLC Engine
      provisionMLCEngine().then(() => {
        logger.info('MLC Engine initialized successfully.');
      });
    }

    return () => {
      // any necessary cleanup, maybe terminate MLC Engine??
    };
  }, [logger, zither, zitherState, selectedModelId]);

  const persistSelectedModel = useCallback((value: string) => {
    mlcEngine.current = undefined; // reset the engine on model change
    setSelectedModelId(value);
    setInitializationReport(null);
  }, []);

  return {
    zitherState,
    mlcEngine,
    initializationReport,
    availableModels: appConfig.current.model_list,
    selectedModelId,
    persistSelectedModel,
    defaultContext,
  };
};

export const OnDeviceExampleApp = ({ coreStart, zither, logger }: OnDeviceExampleAppProps) => {
  const {
    zitherState,
    mlcEngine,
    initializationReport,
    availableModels,
    selectedModelId,
    persistSelectedModel,
    defaultContext,
  } = useMLCEngine({ zither, logger });

  const [chatMessages, setChatMessages] = useState<
    Exclude<webllm.ChatCompletionMessageParam, webllm.ChatCompletionSystemMessageParam>[]
  >([]);
  const [chatInput, setChatInput] = useState<string>('');

  const sendMessage = useCallback(
    async (message: string) => {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', content: message },
        { role: 'assistant', content: 'thinking...' },
      ]);
      setChatInput(''); // clear the input field after sending the message

      await mlcEngine.current?.chat?.completions
        ?.create({
          messages: [...defaultContext.current, { role: 'user', content: message }],
          // below configurations are all optional
          n: 3,
          temperature: 1.5,
          max_tokens: 256,
          logprobs: true,
          top_logprobs: 2,
        })
        .then((reply) => {
          setChatMessages((prevMessages) => {
            return [
              ...prevMessages.slice(0, -1),
              { role: 'assistant', content: reply.choices[0].message.content },
            ];
          });
        });
    },
    [defaultContext, mlcEngine]
  );

  return coreStart.rendering.addContext(
    <EuiFlexGroup
      direction="column"
      css={{
        height:
          'calc(100vh - var(--kbn-layout--application-top, var(--euiFixedHeadersOffset, 0px)))',
      }}
    >
      <EuiFlexItem grow={false}>
        <EuiCallOut color="accent" title="On Device LLM Example App">
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="s">
            <EuiFlexItem grow={7}>
              <p>
                <FormattedMessage
                  id="onDeviceExampleApp.callout.description"
                  defaultMessage="Orchestrated with the Zither Plugin, Powered by <link>mlc</link>"
                  values={{
                    link: (chunks) => (
                      <EuiLink external target="_blank" href="https://github.com/mlc-ai/web-llm">
                        {chunks}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiFlexItem>
            <EuiFlexItem css={{ justifySelf: 'flex-end' }} grow={3}>
              <EuiFormRow
                fullWidth
                helpText={
                  zitherState
                    ? 'Select a model to use with the MLC Engine'
                    : 'Engine orchestrator is unavailable, was a hard refresh performed?'
                }
              >
                <EuiSuperSelect
                  fullWidth
                  disabled={!zitherState || zitherState !== 'activated'}
                  options={availableModels.map((model) => ({
                    value: model.model_id,
                    inputDisplay: model.model_id,
                    dropdownDisplay: (
                      <Fragment>
                        <strong>{model.model_id}</strong>
                        {model?.vram_required_MB && (
                          <EuiText size="s" color="subdued">
                            <p>{`Requires VRAM of ${(model.vram_required_MB / 1024).toFixed(
                              2
                            )}GB`}</p>
                          </EuiText>
                        )}
                      </Fragment>
                    ),
                  }))}
                  onChange={persistSelectedModel}
                  valueOfSelected={selectedModelId ?? undefined}
                  aria-label="Select a model"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel css={{ height: 'calc(100% - 20px)', width: '75%', margin: '0 auto' }}>
          <EuiFlexGroup direction="column" css={{ height: 'inherit' }} responsive={false}>
            <EuiFlexItem
              css={{
                justifyContent: initializationReport?.progress === 1 ? 'flex-start' : 'center',
              }}
            >
              {!selectedModelId ? (
                <div css={centeredStyle}>
                  <EuiText>Please select a model to continue...</EuiText>
                </div>
              ) : (
                <Fragment>
                  {initializationReport && initializationReport?.progress !== 1 ? (
                    <div css={centeredStyle}>
                      <EuiLoadingElastic />
                      <pre>{JSON.stringify(initializationReport, null, 2)}</pre>
                    </div>
                  ) : (
                    <EuiDescriptionList
                      className="eui-yScrollWithShadows"
                      css={{
                        maxHeight: '95%',
                      }}
                      listItems={
                        chatMessages?.map((msg, index) => {
                          return {
                            title: (
                              <EuiBadge color={msg.role === 'user' ? 'primary' : 'accent'}>
                                {msg.role}
                              </EuiBadge>
                            ),
                            description: Array.isArray(msg.content) ? (
                              <>
                                {Array.from(msg.content).map((chatCompletionMessage, idx) => {
                                  return chatCompletionMessage.type === 'text' ? (
                                    <EuiText key={idx}>{chatCompletionMessage.text}</EuiText>
                                  ) : null;
                                })}
                              </>
                            ) : (
                              <EuiText>{msg.content}</EuiText>
                            ),
                            key: `chat-message-${index}`,
                          };
                        }) ?? []
                      }
                    />
                  )}
                </Fragment>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow label="Send Ducky a message" fullWidth>
                <EuiTextArea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your message here..."
                  fullWidth
                />
              </EuiFormRow>
              <EuiFormRow>
                {!selectedModelId && initializationReport?.progress !== 1 ? (
                  <EuiToolTip
                    title="Please select a model to send your message"
                    delay="long"
                    position="top"
                  >
                    <EuiButton disabled>Send Message</EuiButton>
                  </EuiToolTip>
                ) : (
                  <Fragment>
                    <EuiButton onClick={async () => await sendMessage(chatInput)}>
                      Send Message
                    </EuiButton>
                  </Fragment>
                )}
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const renderOnDeviceExampleApp = (container: HTMLElement, deps: OnDeviceExampleAppProps) => {
  ReactDOM.render(<OnDeviceExampleApp {...deps} />, container);

  return () => {
    ReactDOM.unmountComponentAtNode(container);
  };
};
