/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useState, ReactNode } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from 'react-router-dom';
import {
  EuiAvatar,
  EuiButton,
  EuiComment,
  EuiCommentList,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPageTemplate,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

interface OpenAiAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

interface ChatMessage {
  username: string;
  message: string;
  timestamp: string;
  avatar: ReactNode;
}

const formatDate = (date: Date) => date.toLocaleTimeString();
const kibanaUsername = 'Kibana';
const kibanaAvatar = (
  <EuiAvatar name={kibanaUsername} size="l" iconType="logoKibana" iconSize="xl" color="plain" />
);

export const OpenAiApp = ({ basename, notifications, http, navigation }: OpenAiAppDeps) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      username: kibanaUsername,
      message:
        "Hi 👋 I'm a ChatGPT powered assistant who can help answer questions about Kibana by searching the documentation. Ask me a question about Kibana to get started!",
      timestamp: formatDate(new Date()),
      avatar: kibanaAvatar,
    },
  ]);

  const scrollToBottom = () =>
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight));

  const askQuestion = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    const newMessages = [
      ...messages,
      {
        username: 'You',
        message: trimmedQuestion,
        timestamp: formatDate(new Date()),
        avatar: <EuiAvatar name="You" size="l" />,
      },
    ];

    setQuestion('');
    setLoading(true);
    setMessages([
      ...newMessages,
      {
        username: kibanaUsername,
        message: '...',
        timestamp: ' ',
        avatar: kibanaAvatar,
      },
    ]);
    scrollToBottom();

    let message: string;

    try {
      const response = await http.get<{
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
        username: kibanaUsername,
        message,
        timestamp: formatDate(new Date()),
        avatar: kibanaAvatar,
      },
    ]);
    scrollToBottom();
  };

  return (
    <Router basename={basename}>
      <I18nProvider>
        <EuiPageTemplate
          style={{
            paddingBlockStart: 0,
            minBlockSize: 'unset',
            height: 'calc(100vh - 96px)',
          }}
        >
          <EuiPageTemplate.Header pageTitle="Kibana Docs GPT" />
          <EuiPageTemplate.Section
            style={{ overflow: 'hidden' }}
            contentProps={{ style: { height: '100%' } }}
          >
            <EuiFlexGroup direction="column" responsive={false} style={{ height: '100%' }}>
              <EuiFlexItem grow={1} style={{ overflow: 'hidden' }}>
                <div ref={chatRef} style={{ overflow: 'auto' }}>
                  <EuiCommentList>
                    {messages.map((message, index) => (
                      <EuiComment
                        key={index}
                        username={message.username}
                        timelineAvatar={message.avatar}
                        timestamp={message.timestamp}
                      >
                        <EuiMarkdownFormat>{message.message}</EuiMarkdownFormat>
                      </EuiComment>
                    ))}
                  </EuiCommentList>
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup responsive={false}>
                  <EuiFlexItem>
                    <EuiFieldText
                      placeholder="Ask Kibana a question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      fullWidth={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton isLoading={loading} onClick={askQuestion}>
                      Send
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageTemplate.Section>
        </EuiPageTemplate>
      </I18nProvider>
    </Router>
  );
};
