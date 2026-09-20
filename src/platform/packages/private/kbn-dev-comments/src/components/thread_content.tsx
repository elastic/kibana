/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type KeyboardEvent } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComment,
  EuiCommentList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  euiScrollBarStyles,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Comment, CommentAuthor } from '../types';
import { CommentEditor } from './comment_editor';
import { useComments, useCommentsState } from './comments_context';
import { DisplayNameField, useDisplayName } from './display_name_field';
import { useNow } from './hooks';
import { SnapshotImage, useSnapshot } from './snapshot_image';

export interface ThreadContentProps {
  comment: Comment;
  onClose?: () => void;
  /** Offered when the commented element is not on screen: guides the reader to it. */
  onGuide?: () => void;
  /**
   * Below a panel row, which shows the comment itself: only its context, replies
   * and the reply form, in the flow of the panel. Otherwise the thread fills a
   * popover: actions on top, the comments scrolling in between, the form below.
   */
  inline?: boolean;
}

const bodyStyles = css`
  word-break: break-word;
`;

export const CommentBody = ({ text }: { text: string }) => (
  <EuiMarkdownFormat textSize="s" css={bodyStyles}>
    {text}
  </EuiMarkdownFormat>
);

/** When something was written: as the host shows it (e.g. "5 minutes ago"), else the local time, which is the tooltip either way. */
const TimeLabel = ({ at }: { at: string }) => {
  const { RelativeTime } = useComments().services;
  // Rendered again every half minute, so that the host's relative time keeps up.
  useNow();
  const local = new Date(at).toLocaleString();
  return <span title={local}>{RelativeTime ? <RelativeTime value={at} /> : local}</span>;
};

export const AuthorMeta = ({ author, at }: { author: CommentAuthor; at: string }) => (
  <EuiText size="xs">
    <strong>{author.displayName}</strong>{' '}
    <EuiTextColor color="subdued">
      <time dateTime={at}>
        <TimeLabel at={at} />
      </time>
    </EuiTextColor>
  </EuiText>
);

/** Whether a reply or resolve request is in flight for the comment; kept in the store so remounts cannot forget it. */
const useThreadBusy = (id: string): boolean => useCommentsState((state) => state.busyIds.has(id));

export const ResolveButton = ({ comment }: { comment: Comment }) => {
  const controller = useComments();
  const busy = useThreadBusy(comment.id);
  const label = comment.resolved
    ? i18n.translate('devComments.thread.reopen', { defaultMessage: 'Reopen this thread.' })
    : i18n.translate('devComments.thread.resolve', { defaultMessage: 'Resolve this thread.' });

  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={comment.resolved ? 'refresh' : 'check'}
        color={comment.resolved ? 'text' : 'success'}
        size="xs"
        isDisabled={busy}
        onClick={() => void controller.setResolved(comment.id, !comment.resolved)}
        aria-label={label}
        data-test-subj="devCommentsToggleResolved"
      />
    </EuiToolTip>
  );
};

export const ThreadContent = ({
  comment,
  onClose,
  onGuide,
  inline = false,
}: ThreadContentProps) => {
  const controller = useComments();
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  // The draft outlives this component: a pin scrolling out of view unmounts its thread.
  const reply = useCommentsState((state) => state.drafts[comment.id] ?? '');
  const [displayName, setDisplayName] = useDisplayName();
  const busy = useThreadBusy(comment.id);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const snapshot = useSnapshot(comment.id, screenshotOpen && comment.snapshot !== undefined);
  const canReply = !busy && reply.trim().length > 0 && displayName.trim().length > 0;

  const closeLabel = i18n.translate('devComments.thread.close', {
    defaultMessage: 'Close',
  });

  const submitReply = () => {
    if (canReply) {
      void controller.reply(comment.id, reply, displayName);
    }
  };

  const onReplyKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submitReply();
    }
  };

  // Ways back to what the author saw: below the comment's text, or on their own
  // when the container shows the comment already.
  const context = (comment.snapshot || onGuide) && (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        {onGuide && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="external"
              flush="left"
              onClick={onGuide}
              data-test-subj="devCommentsGuide"
            >
              {i18n.translate('devComments.thread.takeMeThere', {
                defaultMessage: 'Take me there',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {comment.snapshot && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="image"
              flush="left"
              isLoading={snapshot.loading}
              onClick={() => setScreenshotOpen((open) => !open)}
              data-test-subj="devCommentsShowSnapshot"
            >
              {screenshotOpen
                ? i18n.translate('devComments.thread.hideScreenshot', {
                    defaultMessage: 'Hide screenshot',
                  })
                : i18n.translate('devComments.thread.showScreenshot', {
                    defaultMessage: 'Show screenshot',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {comment.snapshot && screenshotOpen && (
        <>
          <EuiSpacer size="xs" />
          <SnapshotImage comment={comment} snapshot={comment.snapshot} state={snapshot} />
        </>
      )}
    </>
  );

  const hasTimeline = !inline || comment.replies.length > 0;

  const actions = !inline && (
    <EuiFlexGroup
      gutterSize="xs"
      justifyContent="flexEnd"
      alignItems="center"
      responsive={false}
      css={css`
        flex: none;
        padding-bottom: ${euiTheme.size.xs};
      `}
    >
      <EuiFlexItem grow={false}>
        <ResolveButton comment={comment} />
      </EuiFlexItem>
      {onClose && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={closeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              size="xs"
              onClick={onClose}
              aria-label={closeLabel}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  const timeline = hasTimeline && (
    <EuiCommentList
      aria-label={i18n.translate('devComments.thread.label', {
        defaultMessage: 'Comment thread',
      })}
      gutterSize="m"
    >
      {!inline && (
        <EuiComment
          username={comment.author.displayName}
          timelineAvatar={<EuiAvatar name={comment.author.displayName} />}
          event={
            <>
              {i18n.translate('devComments.thread.commented', { defaultMessage: 'commented' })}
              {comment.resolved && (
                <>
                  {' '}
                  <EuiBadge color="success" iconType="check">
                    {i18n.translate('devComments.thread.resolvedBadge', {
                      defaultMessage: 'Resolved',
                    })}
                  </EuiBadge>
                </>
              )}
            </>
          }
          eventColor={comment.resolved ? 'success' : undefined}
          timestamp={<TimeLabel at={comment.createdAt} />}
        >
          <CommentBody text={comment.text} />
          {context && (
            <>
              <EuiSpacer size="xs" />
              {context}
            </>
          )}
        </EuiComment>
      )}
      {comment.replies.map((item) => (
        <EuiComment
          key={item.id}
          username={item.author.displayName}
          timelineAvatar={<EuiAvatar name={item.author.displayName} />}
          event={i18n.translate('devComments.thread.replied', { defaultMessage: 'replied' })}
          timestamp={<TimeLabel at={item.createdAt} />}
        >
          <CommentBody text={item.text} />
        </EuiComment>
      ))}
    </EuiCommentList>
  );

  return (
    <div
      css={
        inline
          ? undefined
          : css`
              display: flex;
              flex-direction: column;
              min-height: 0;
            `
      }
      data-test-subj="devCommentsThread"
    >
      {actions}
      {inline ? (
        <>
          {context && (
            <>
              {context}
              <EuiSpacer size="s" />
            </>
          )}
          {timeline}
        </>
      ) : (
        <div
          css={css`
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            ${euiScrollBarStyles(euiThemeContext)}
            /* Room for focus rings and the scrollbar. */
            padding: ${euiTheme.size.xs} ${euiTheme.size.xs} 0 0;
          `}
        >
          {timeline}
        </div>
      )}
      <div
        css={css`
          flex: none;
          padding-top: ${hasTimeline ? euiTheme.size.m : 0};
        `}
        data-test-subj="devCommentsReplyForm"
      >
        <CommentEditor
          value={reply}
          readOnly={busy}
          onChange={(value) => controller.setDraft(comment.id, value)}
          onSubmit={submitReply}
          placeholder={i18n.translate('devComments.thread.replyPlaceholder', {
            defaultMessage: 'Reply…',
          })}
          aria-label={i18n.translate('devComments.thread.replyLabel', {
            defaultMessage: 'Reply',
          })}
          data-test-subj="devCommentsReplyInput"
        />
        <EuiSpacer size="s" />
        <DisplayNameField
          value={displayName}
          onChange={setDisplayName}
          onKeyDown={onReplyKeyDown}
          readOnly={busy}
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              isDisabled={!canReply}
              isLoading={busy}
              onClick={submitReply}
              data-test-subj="devCommentsReplySubmit"
            >
              {i18n.translate('devComments.thread.replyButton', { defaultMessage: 'Reply' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
