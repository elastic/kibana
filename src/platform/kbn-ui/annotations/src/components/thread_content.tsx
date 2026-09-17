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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTextColor,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { COMMENT_MAX_LENGTH } from '../constants';
import type { Annotation, AnnotationAuthor } from '../types';
import { formatRelativeTime } from '../lib/format_time';
import { useAnnotations, useAnnotationsState } from './annotations_context';
import { DisplayNameField, useDisplayName } from './display_name_field';
import { useNow } from './hooks';
import { SnapshotImage, useSnapshot } from './snapshot_image';

export interface ThreadContentProps {
  annotation: Annotation;
  onClose?: () => void;
  /** Offered when the commented element is not on screen: guides the reader to it. */
  onGuide?: () => void;
  /** False when the container already shows the comment's header and text (the panel rows do). */
  showComment?: boolean;
}

export const commentTextStyles = css`
  white-space: pre-wrap;
  word-break: break-word;
`;

export const AuthorMeta = ({ author, at }: { author: AnnotationAuthor; at: string }) => {
  const now = useNow();
  return (
    <EuiText size="xs">
      <strong>{author.displayName}</strong>{' '}
      <EuiTextColor color="subdued">
        <time dateTime={at} title={new Date(at).toLocaleString()}>
          {formatRelativeTime(at, now)}
        </time>
      </EuiTextColor>
    </EuiText>
  );
};

/** Whether a reply or resolve request is in flight for the comment; kept in the store so remounts cannot forget it. */
const useThreadBusy = (id: string): boolean =>
  useAnnotationsState((state) => state.busyIds.has(id));

export const ResolveButton = ({ annotation }: { annotation: Annotation }) => {
  const controller = useAnnotations();
  const busy = useThreadBusy(annotation.id);
  const label = annotation.resolved
    ? i18n.translate('kbnUI.annotations.thread.reopen', { defaultMessage: 'Reopen' })
    : i18n.translate('kbnUI.annotations.thread.resolve', { defaultMessage: 'Resolve' });

  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={annotation.resolved ? 'refresh' : 'check'}
        color={annotation.resolved ? 'text' : 'success'}
        size="xs"
        isDisabled={busy}
        onClick={() => void controller.setResolved(annotation.id, !annotation.resolved)}
        aria-label={label}
        data-test-subj="kbnUiAnnotationsToggleResolved"
      />
    </EuiToolTip>
  );
};

const AuthorLine = ({ author, at }: { author: AnnotationAuthor; at: string }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiAvatar name={author.displayName} size="s" />
    </EuiFlexItem>
    <EuiFlexItem>
      <AuthorMeta author={author} at={at} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ThreadContent = ({
  annotation,
  onClose,
  onGuide,
  showComment = true,
}: ThreadContentProps) => {
  const controller = useAnnotations();
  const { euiTheme } = useEuiTheme();
  // The draft outlives this component: a pin scrolling out of view unmounts its thread.
  const reply = useAnnotationsState((state) => state.drafts[annotation.id] ?? '');
  const [displayName, setDisplayName] = useDisplayName();
  const busy = useThreadBusy(annotation.id);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const snapshot = useSnapshot(annotation.id, screenshotOpen && annotation.snapshot !== undefined);
  const canReply = !busy && reply.trim().length > 0 && displayName.trim().length > 0;

  const closeLabel = i18n.translate('kbnUI.annotations.thread.close', {
    defaultMessage: 'Close',
  });

  const submitReply = () => {
    if (canReply) {
      void controller.reply(annotation.id, reply, displayName);
    }
  };

  const onReplyKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submitReply();
    }
  };

  return (
    <div data-test-subj="kbnUiAnnotationsThread">
      {showComment && (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <AuthorLine author={annotation.author} at={annotation.createdAt} />
            </EuiFlexItem>
            {annotation.resolved && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="success" iconType="check">
                  {i18n.translate('kbnUI.annotations.thread.resolvedBadge', {
                    defaultMessage: 'Resolved',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <ResolveButton annotation={annotation} />
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
          <EuiSpacer size="s" />
          <EuiText size="s" css={commentTextStyles}>
            {annotation.text}
          </EuiText>
        </>
      )}
      {(annotation.snapshot || onGuide) && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            {onGuide && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="waypoint"
                  flush="left"
                  onClick={onGuide}
                  data-test-subj="kbnUiAnnotationsGuide"
                >
                  {i18n.translate('kbnUI.annotations.thread.takeMeThere', {
                    defaultMessage: 'Take me there',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {annotation.snapshot && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="image"
                  flush="left"
                  isLoading={snapshot.loading}
                  onClick={() => setScreenshotOpen((open) => !open)}
                  data-test-subj="kbnUiAnnotationsShowSnapshot"
                >
                  {screenshotOpen
                    ? i18n.translate('kbnUI.annotations.thread.hideScreenshot', {
                        defaultMessage: 'Hide screenshot',
                      })
                    : i18n.translate('kbnUI.annotations.thread.showScreenshot', {
                        defaultMessage: 'Show screenshot',
                      })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {annotation.snapshot && screenshotOpen && (
            <>
              <EuiSpacer size="xs" />
              <SnapshotImage
                annotation={annotation}
                snapshot={annotation.snapshot}
                state={snapshot}
              />
            </>
          )}
        </>
      )}

      {annotation.replies.length > 0 && (
        <>
          <EuiHorizontalRule margin="s" />
          {annotation.replies.map((item) => (
            <div
              key={item.id}
              css={css`
                padding-bottom: ${euiTheme.size.s};
              `}
            >
              <AuthorLine author={item.author} at={item.createdAt} />
              <EuiSpacer size="xs" />
              <EuiText size="s" css={commentTextStyles}>
                {item.text}
              </EuiText>
            </div>
          ))}
        </>
      )}

      <EuiHorizontalRule margin="s" />
      <EuiTextArea
        compressed
        rows={2}
        fullWidth
        value={reply}
        maxLength={COMMENT_MAX_LENGTH}
        readOnly={busy}
        onChange={(event) => controller.setDraft(annotation.id, event.target.value)}
        onKeyDown={onReplyKeyDown}
        placeholder={i18n.translate('kbnUI.annotations.thread.replyPlaceholder', {
          defaultMessage: 'Reply…',
        })}
        aria-label={i18n.translate('kbnUI.annotations.thread.replyLabel', {
          defaultMessage: 'Reply',
        })}
        data-test-subj="kbnUiAnnotationsReplyInput"
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
            data-test-subj="kbnUiAnnotationsReplySubmit"
          >
            {i18n.translate('kbnUI.annotations.thread.replyButton', { defaultMessage: 'Reply' })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
