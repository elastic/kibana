/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiPaddingCSS,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef, useState } from 'react';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';

const ExampleEntry = ({ question, onClick }: { question: string; onClick: () => void }) => {
  return (
    <EuiPanel color="subdued" hasShadow={false} tabIndex={0} onClick={onClick}>
      {question}
    </EuiPanel>
  );
};

const Message = ({
  loading,
  response,
  content,
}: {
  loading?: boolean;
  response: boolean;
  content?: string;
}) => {
  const [loadingIndicator, setLoadingIndicator] = useState('');

  useEffect(() => {
    if (!loading) {
      return;
    }

    const interval = setInterval(() => {
      setLoadingIndicator((indicator) => {
        if (indicator.length >= 3) {
          return '';
        }
        return `${indicator}.`;
      });
    }, 400);

    return () => clearInterval(interval);
  });

  return (
    <>
      <EuiSpacer size="s" />
      <EuiPanel color={response ? 'subdued' : 'primary'} hasShadow={false}>
        {loading ? (
          loadingIndicator || <>&nbsp;</>
        ) : content ? (
          <EuiMarkdownFormat textSize="relative">{content}</EuiMarkdownFormat>
        ) : undefined}
      </EuiPanel>
    </>
  );
};

const examples = [
  'How do I create a new temporary data view?',
  'What happens when an alert I created gets triggered?',
  'Can I create a histogram breakdown in Lens?',
];

export const [getCoreStart, setCoreStart] = createGetterSetter<CoreStart>('coreStart');

export const DocsGpt = ({ username }: { username?: string }) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<
    Array<{ loading?: boolean; response: boolean; content?: string }>
  >([]);

  const scrollToBottom = () =>
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight));

  const askQuestion = async (currentQuestion: string) => {
    const trimmedQuestion = currentQuestion.trim();

    if (!trimmedQuestion) {
      return;
    }

    const newMessages = [
      ...messages,
      {
        response: false,
        content: trimmedQuestion,
      },
    ];

    setQuestion('');
    setLoading(true);
    setMessages([
      ...newMessages,
      {
        loading: true,
        response: true,
      },
    ]);
    scrollToBottom();

    let message: string;

    try {
      const response = await getCoreStart().http.get<{
        answer: string;
        references: Array<{ title: string; url: string }>;
      }>('/internal/open_ai/kibana_docs', {
        query: { query: trimmedQuestion },
      });

      const messageParts = [response.answer];

      if (response.references.length) {
        const references = response.references
          .map(({ title, url }) => `* [${title}](${url})`)
          .join('\n');

        messageParts.push(`##### References:\n${references}`);
      }

      message = messageParts.join('\n\n');
    } catch (e) {
      message = `Sorry, I encountered an error while trying to answer your question:\n\`\`\`\n${e.toString()}\n\`\`\``;
    }

    setLoading(false);
    setMessages([
      ...newMessages,
      {
        response: true,
        content: message,
      },
    ]);
    scrollToBottom();
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={css`
        height: 100%;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>Hi{username && ' ' + username}, how can I help?</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          overflow: hidden;
        `}
      >
        <div
          ref={chatRef}
          className="eui-yScrollWithShadows"
          css={css`
            ${useEuiPaddingCSS('top').s};
            ${useEuiPaddingCSS('bottom').s};
          `}
        >
          {!messages.length && (
            <EuiPanel hasShadow={false} hasBorder={true}>
              <EuiTitle className="eui-textCenter" size="xxs">
                <h2>Examples</h2>
              </EuiTitle>
              {examples.map((example, i) => (
                <>
                  <EuiSpacer key={`spacer-${i}`} size="s" />{' '}
                  <ExampleEntry
                    key={`example-${i}`}
                    question={example}
                    onClick={() => askQuestion(example)}
                  />
                </>
              ))}
            </EuiPanel>
          )}
          {messages.map((message, i) => (
            <Message key={i} {...message} />
          ))}
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem>
                <EuiFieldText
                  placeholder="Ask me anything"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  fullWidth={true}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton isLoading={loading} onClick={() => askQuestion(question)}>
                  Send
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <p>
                Free research preview. ChatGPT may produce inaccurate information about people,
                places, or facts.
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const OpenAiLogo = () => {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" width="16" height="16">
      <path d="M239.183914,106.202783 C245.054304,88.5242096 243.02228,69.1733805 233.607599,53.0998864 C219.451678,28.4588021 190.999703,15.7836129 163.213007,21.739505 C147.554077,4.32145883 123.794909,-3.42398554 100.87901,1.41873898 C77.9631105,6.26146349 59.3690093,22.9572536 52.0959621,45.2214219 C33.8436494,48.9644867 18.0901721,60.392749 8.86672513,76.5818033 C-5.443491,101.182962 -2.19544431,132.215255 16.8986662,153.320094 C11.0060865,170.990656 13.0197283,190.343991 22.4238231,206.422991 C36.5975553,231.072344 65.0680342,243.746566 92.8695738,237.783372 C105.235639,251.708249 123.001113,259.630942 141.623968,259.52692 C170.105359,259.552169 195.337611,241.165718 204.037777,214.045661 C222.28734,210.296356 238.038489,198.869783 247.267014,182.68528 C261.404453,158.127515 258.142494,127.262775 239.183914,106.202783 L239.183914,106.202783 Z M141.623968,242.541207 C130.255682,242.559177 119.243876,238.574642 110.519381,231.286197 L112.054146,230.416496 L163.724595,200.590881 C166.340648,199.056444 167.954321,196.256818 167.970781,193.224005 L167.970781,120.373788 L189.815614,133.010026 C190.034132,133.121423 190.186235,133.330564 190.224885,133.572774 L190.224885,193.940229 C190.168603,220.758427 168.442166,242.484864 141.623968,242.541207 Z M37.1575749,197.93062 C31.456498,188.086359 29.4094818,176.546984 31.3766237,165.342426 L32.9113895,166.263285 L84.6329973,196.088901 C87.2389349,197.618207 90.4682717,197.618207 93.0742093,196.088901 L156.255402,159.663793 L156.255402,184.885111 C156.243557,185.149771 156.111725,185.394602 155.89729,185.550176 L103.561776,215.733903 C80.3054953,229.131632 50.5924954,221.165435 37.1575749,197.93062 Z M23.5493181,85.3811273 C29.2899861,75.4733097 38.3511911,67.9162648 49.1287482,64.0478825 L49.1287482,125.438515 C49.0891492,128.459425 50.6965386,131.262556 53.3237748,132.754232 L116.198014,169.025864 L94.3531808,181.662102 C94.1132325,181.789434 93.8257461,181.789434 93.5857979,181.662102 L41.3526015,151.529534 C18.1419426,138.076098 10.1817681,108.385562 23.5493181,85.125333 L23.5493181,85.3811273 Z M203.0146,127.075598 L139.935725,90.4458545 L161.7294,77.8607748 C161.969348,77.7334434 162.256834,77.7334434 162.496783,77.8607748 L214.729979,108.044502 C231.032329,117.451747 240.437294,135.426109 238.871504,154.182739 C237.305714,172.939368 225.050719,189.105572 207.414262,195.67963 L207.414262,134.288998 C207.322521,131.276867 205.650697,128.535853 203.0146,127.075598 Z M224.757116,94.3850867 L223.22235,93.4642272 L171.60306,63.3828173 C168.981293,61.8443751 165.732456,61.8443751 163.110689,63.3828173 L99.9806554,99.8079259 L99.9806554,74.5866077 C99.9533004,74.3254088 100.071095,74.0701869 100.287609,73.9215426 L152.520805,43.7889738 C168.863098,34.3743518 189.174256,35.2529043 204.642579,46.0434841 C220.110903,56.8340638 227.949269,75.5923959 224.757116,94.1804513 L224.757116,94.3850867 Z M88.0606409,139.097931 L66.2158076,126.512851 C65.9950399,126.379091 65.8450965,126.154176 65.8065367,125.898945 L65.8065367,65.684966 C65.8314495,46.8285367 76.7500605,29.6846032 93.8270852,21.6883055 C110.90411,13.6920079 131.063833,16.2835462 145.5632,28.338998 L144.028434,29.2086986 L92.3579852,59.0343142 C89.7419327,60.5687513 88.1282597,63.3683767 88.1117998,66.4011901 L88.0606409,139.097931 Z M99.9294965,113.5185 L128.06687,97.3011417 L156.255402,113.5185 L156.255402,145.953218 L128.169187,162.170577 L99.9806554,145.953218 L99.9294965,113.5185 Z" />
    </svg>
  );
};
