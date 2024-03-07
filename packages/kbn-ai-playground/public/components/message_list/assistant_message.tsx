/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import moment from 'moment';

import {
  EuiButtonEmpty,
  EuiComment,
  EuiFlexGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { AIMessage as AIMessageType } from '../../../types';

import { CopyActionButton } from './copy_action_button';
import { CitationsTable } from './citations_table';
import { RetrievalDocsFlyout } from './retrieval_docs_flyout';

type AssistantMessageProps = Pick<
  AIMessageType,
  'content' | 'createdAt' | 'citations' | 'retrievalDocs'
>;

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  content,
  createdAt,
  citations,
  retrievalDocs,
}) => {
  const [isDocsFlyoutOpen, setIsDocsFlyoutOpen] = useState(false);

  return (
    <EuiComment
      username={i18n.translate('aiPlayground.chat.message.assistant.username', {
        defaultMessage: 'AI',
      })}
      event={i18n.translate('aiPlayground.chat.message.assistant.event', {
        defaultMessage: 'responded',
      })}
      timestamp={
        createdAt &&
        i18n.translate('aiPlayground.chat.message.assistant.createdAt', {
          defaultMessage: 'on {date}',
          values: {
            date: moment(createdAt).format('MMM DD, YYYY'),
          },
        })
      }
      timelineAvatar="compute"
      timelineAvatarAriaLabel={i18n.translate(
        'aiPlayground.chat.message.assistant.avatarAriaLabel',
        {
          defaultMessage: 'AI',
        }
      )}
      actions={
        <CopyActionButton
          copyText={String(content)}
          ariaLabel={i18n.translate('aiPlayground.chat.message.assistant.copyLabel', {
            defaultMessage: 'Copy assistant message',
          })}
        />
      }
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiTitle size="xs">
          <p>
            {i18n.translate('aiPlayground.chat.message.assistant.title', {
              defaultMessage: 'Summary',
            })}
          </p>
        </EuiTitle>
        {!!retrievalDocs?.length && (
          <>
            <EuiButtonEmpty onClick={() => setIsDocsFlyoutOpen(true)}>
              {i18n.translate('aiPlayground.chat.message.assistant.retrievalDocButton', {
                defaultMessage:
                  '{count} {count, plural, one {document} other {documents}} retrieved',
                values: { count: retrievalDocs.length },
              })}
            </EuiButtonEmpty>

            {isDocsFlyoutOpen && (
              <RetrievalDocsFlyout
                onClose={() => setIsDocsFlyoutOpen(false)}
                retrievalDocs={retrievalDocs}
              />
            )}
          </>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{content}</p>
      </EuiText>
      {!!citations?.length && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <p>
              {i18n.translate('aiPlayground.chat.message.assistant.citations.title', {
                defaultMessage: 'Citations',
              })}
            </p>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <CitationsTable citations={citations} />
        </>
      )}
    </EuiComment>
  );
};
