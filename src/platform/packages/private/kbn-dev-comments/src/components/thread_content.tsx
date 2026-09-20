/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type KeyboardEvent, type PropsWithChildren, type ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComment,
  EuiCommentList,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiPanel,
  EuiToolTip,
  euiScrollBarStyles,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Comment } from '../types';
import { CommentEditor } from './comment_editor';
import { useComments, useCommentsState } from './comments_context';
import { DisplayNameField, useDisplayName } from './display_name_field';
import { useNow } from './hooks';
import { SnapshotImage, useSnapshot } from './snapshot_image';

export interface ThreadContentProps {
  comment: Comment;
  onClose?: () => void;
  inline?: boolean;
  rootActions?: ReactNode;
  folded?: ReactNode;
}

const bodyStyles = css`
  word-break: break-word;
`;

const CommentBody = ({ text }: { text: string }) => (
  <EuiMarkdownFormat textSize="s" css={bodyStyles}>
    {text}
  </EuiMarkdownFormat>
);

const TimeLabel = ({ at, tooltip = true }: { at: string; tooltip?: boolean }) => {
  const { RelativeTime } = useComments().services;
  // Rendered again every half minute, so that the host's relative time keeps up.
  useNow();
  const local = new Date(at).toLocaleString();
  return (
    <span title={tooltip ? local : undefined}>
      {RelativeTime ? <RelativeTime value={at} /> : local}
    </span>
  );
};

/** Whether a reply or resolve request is in flight for the comment; kept in the store so remounts cannot forget it. */
const useThreadBusy = (id: string): boolean => useCommentsState((state) => state.busyIds.has(id));

export const ResolveButton = ({ comment }: { comment: Comment }) => {
  const controller = useComments();
  const busy = useThreadBusy(comment.id);
  const label = comment.resolved
    ? i18n.translate('devComments.thread.unresolve', { defaultMessage: 'Unresolve this thread.' })
    : i18n.translate('devComments.thread.resolve', { defaultMessage: 'Resolve this thread.' });

  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={comment.resolved ? 'undo' : 'check'}
        color={comment.resolved ? 'danger' : 'success'}
        size="xs"
        isDisabled={busy}
        onClick={() => void controller.setResolved(comment.id, !comment.resolved)}
        aria-label={label}
        data-test-subj="devCommentsToggleResolved"
      />
    </EuiToolTip>
  );
};

/** Copies the text of a comment (as written, in Markdown), nothing else. */
const CopyButton = ({ text }: { text: string }) => {
  const label = i18n.translate('devComments.thread.copy', { defaultMessage: 'Copy this comment.' });
  return (
    <EuiCopy
      textToCopy={text}
      beforeMessage={label}
      afterMessage={i18n.translate('devComments.thread.copied', { defaultMessage: 'Copied.' })}
      tooltipProps={{ disableScreenReaderOutput: true }}
    >
      {(copy) => (
        <EuiButtonIcon
          iconType="copy"
          color="text"
          size="xs"
          onClick={copy}
          aria-label={label}
          data-test-subj="devCommentsCopy"
        />
      )}
    </EuiCopy>
  );
};

/** When the comments were last fetched, and a way to fetch them again; drafts are kept. */
export const RefreshButton = ({
  label,
  'data-test-subj': dataTestSubj,
}: {
  /** What the button fetches again, as its tooltip. */
  label: string;
  'data-test-subj': string;
}) => {
  const controller = useComments();
  const loadedAt = useCommentsState((state) => state.loadedAt);
  const loading = useCommentsState((state) => state.loading);
  return (
    <EuiToolTip content={label}>
      <EuiButtonEmpty
        size="xs"
        color="text"
        iconType="refresh"
        flush="left"
        isLoading={loading}
        onClick={() => void controller.reload()}
        data-test-subj={dataTestSubj}
      >
        {loadedAt ? (
          <>
            {i18n.translate('devComments.refresh.updated', { defaultMessage: 'Updated' })}{' '}
            <TimeLabel at={loadedAt} tooltip={false} />
          </>
        ) : (
          i18n.translate('devComments.refresh.refresh', { defaultMessage: 'Refresh' })
        )}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};

const CommentCard = ({
  name,
  actions,
  label,
  at,
  resolved = false,
  children,
}: PropsWithChildren<{
  name: string;
  actions: ReactNode;
  /** What happened: "commented", "replied". */
  label: string;
  at: string;
  resolved?: boolean;
}>) => {
  const { euiTheme } = useEuiTheme();
  const borderColor = resolved
    ? euiTheme.colors.borderBaseSuccess
    : euiTheme.colors.borderBaseSubdued;
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css`
        border-color: ${borderColor};
        overflow: hidden;
      `}
    >
      <EuiPanel
        color={resolved ? 'success' : 'highlighted'}
        paddingSize="s"
        borderRadius="none"
        hasShadow={false}
        css={css`
          border-bottom: ${euiTheme.border.width.thin} solid ${borderColor};
        `}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {name}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {actions}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div>
          {label}{' '}
          <time dateTime={at}>
            <TimeLabel at={at} />
          </time>
        </div>
      </EuiPanel>
      <div
        css={css`
          padding: ${euiTheme.size.s};
        `}
      >
        {children}
      </div>
    </EuiPanel>
  );
};

/**
 * The first comment of a thread as an item of its timeline, with `children` in
 * place of its text. The panel shows it folded, its text a preview, and opened;
 * its header is the same either way, only the body changes.
 */
export const RootComment = ({
  comment,
  actions,
  children,
}: PropsWithChildren<{ comment: Comment; actions?: ReactNode }>) => (
  <EuiComment
    username={comment.author.displayName}
    timelineAvatar={<EuiAvatar name={comment.author.displayName} />}
  >
    <CommentCard
      name={comment.author.displayName}
      actions={
        <>
          <CopyButton text={comment.text} />
          {actions}
        </>
      }
      label={i18n.translate('devComments.thread.commented', { defaultMessage: 'commented' })}
      at={comment.createdAt}
      resolved={comment.resolved}
    >
      {children}
    </CommentCard>
  </EuiComment>
);

export const ThreadContent = ({
  comment,
  onClose,
  inline = false,
  rootActions,
  folded,
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

  // The screenshot, below the comment's text.
  const context = comment.snapshot && (
    <>
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
      {screenshotOpen && (
        <>
          <EuiSpacer size="xs" />
          <SnapshotImage comment={comment} snapshot={comment.snapshot} state={snapshot} />
        </>
      )}
    </>
  );

  const actions = !inline && (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      css={css`
        flex: none;
        padding-bottom: ${euiTheme.size.xs};
      `}
    >
      <EuiFlexItem grow={false}>
        <RefreshButton
          label={i18n.translate('devComments.thread.refresh', {
            defaultMessage: 'Refresh this thread.',
          })}
          data-test-subj="devCommentsThreadRefresh"
        />
      </EuiFlexItem>
      <EuiFlexItem />
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

  const timeline = (
    <EuiCommentList
      aria-label={i18n.translate('devComments.thread.label', {
        defaultMessage: 'Comment thread',
      })}
      gutterSize="m"
    >
      <RootComment comment={comment} actions={rootActions}>
        {folded ?? (
          <>
            <CommentBody text={comment.text} />
            {context && (
              <>
                <EuiSpacer size="xs" />
                {context}
              </>
            )}
          </>
        )}
      </RootComment>
      {!folded &&
        comment.replies.map((item) => (
          <EuiComment
            key={item.id}
            username={item.author.displayName}
            timelineAvatar={<EuiAvatar name={item.author.displayName} />}
          >
            <CommentCard
              name={item.author.displayName}
              actions={<CopyButton text={item.text} />}
              label={i18n.translate('devComments.thread.replied', { defaultMessage: 'replied' })}
              at={item.createdAt}
            >
              <CommentBody text={item.text} />
            </CommentCard>
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
      data-test-subj={folded ? undefined : 'devCommentsThread'}
    >
      {actions}
      {inline ? (
        timeline
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
      {!folded && (
        <div
          css={css`
            flex: none;
            padding-top: ${euiTheme.size.m};
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
      )}
    </div>
  );
};
