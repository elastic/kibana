/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

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

import type { AIMessage as AIMessageType } from '../../types';

import { CopyActionButton } from './copy_action_button';
import { CitationsTable } from './citations_table';

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
          <EuiButtonEmpty>
            {i18n.translate('aiPlayground.chat.message.assistant.retrievalDocButton', {
              defaultMessage: '{count} {count, plural, one {document} other {documents}} retrieved',
              values: { count: retrievalDocs.length },
            })}
          </EuiButtonEmpty>
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
