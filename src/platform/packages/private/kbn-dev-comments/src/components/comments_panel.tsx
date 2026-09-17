/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiScrollBarStyles,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IGNORE_ATTR } from '../constants';
import type { Comment } from '../types';
import { useComments, useCommentsState } from './comments_context';
import { useLayerPortal, useLayerZIndex } from './hooks';
import { threadSize } from './pins_layer';
import { useResolvedAnchors } from './resolved_anchors';
import { AuthorMeta, ResolveButton, ThreadContent, commentTextStyles } from './thread_content';

const ignoreProps = { [IGNORE_ATTR]: true } as Record<string, unknown>;

const clampedTextStyles = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

interface PageGroup {
  pageKey: string;
  comments: Comment[];
}

/** Comments by page, the current page first and the rest by page key. */
const groupByPage = (comments: Comment[], currentPageKey: string): PageGroup[] => {
  const groups = new Map<string, PageGroup>();
  comments.forEach((comment) => {
    const { pageKey } = comment.route;
    const group = groups.get(pageKey) ?? { pageKey, comments: [] };
    group.comments.push(comment);
    groups.set(pageKey, group);
  });
  return Array.from(groups.values()).sort((a, b) => {
    const aCurrent = a.pageKey === currentPageKey;
    const bCurrent = b.pageKey === currentPageKey;
    return aCurrent === bCurrent ? a.pageKey.localeCompare(b.pageKey) : aCurrent ? -1 : 1;
  });
};

const ThreadSizeBadge = ({ comment }: { comment: Comment }) => {
  const count = threadSize(comment);
  const label = i18n.translate('devComments.panel.threadSize', {
    defaultMessage: '{count, plural, one {# message} other {# messages}}',
    values: { count },
  });
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiBadge
        color={comment.resolved ? 'success' : 'primary'}
        iconType="comment"
        aria-label={label}
        tabIndex={0}
      >
        {count}
      </EuiBadge>
    </EuiToolTip>
  );
};

const PanelRow = ({
  comment,
  onScreen,
  expanded,
  active,
  onSelect,
  onGuide,
}: {
  comment: Comment;
  onScreen: boolean;
  /** The thread is shown inline below the row (its element is not on screen). */
  expanded: boolean;
  /** The row's thread is the one currently open from a pin. */
  active: boolean;
  onSelect: () => void;
  onGuide: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded || active) {
      rowRef.current?.scrollIntoView({ block: expanded ? 'start' : 'nearest' });
    }
  }, [expanded, active]);

  const guideLabel = i18n.translate('devComments.panel.notVisible', {
    defaultMessage: 'Not visible on this page. Click to navigate.',
  });

  return (
    <div
      ref={rowRef}
      css={css`
        border-bottom: ${euiTheme.border.thin};
        padding: ${euiTheme.size.xs} 0;
      `}
      data-test-subj={`devCommentsPanelItem-${comment.id}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <EuiPanel
            paddingSize="s"
            color="transparent"
            hasShadow={false}
            onClick={onSelect}
            aria-expanded={expanded}
          >
            <AuthorMeta author={comment.author} at={comment.createdAt} />
            <EuiSpacer size="xs" />
            <EuiText size="s" css={expanded ? commentTextStyles : clampedTextStyles}>
              {comment.text}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            align-items: center;
            gap: ${euiTheme.size.xs};
            padding-top: ${euiTheme.size.s};
          `}
        >
          <ResolveButton comment={comment} />
          <ThreadSizeBadge comment={comment} />
          {onScreen ? (
            <EuiIconTip
              type="eye"
              color="primary"
              content={i18n.translate('devComments.panel.visible', {
                defaultMessage: 'Visible on this page.',
              })}
            />
          ) : (
            <EuiToolTip content={guideLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="external"
                size="xs"
                onClick={onGuide}
                aria-label={guideLabel}
                data-test-subj="devCommentsPanelGuide"
              />
            </EuiToolTip>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      {expanded && (
        <div
          css={css`
            margin-top: ${euiTheme.size.xs};
            margin-left: ${euiTheme.size.s};
            padding-left: ${euiTheme.size.base};
            border-left: ${euiTheme.border.thin};
          `}
        >
          <ThreadContent comment={comment} showComment={false} onGuide={onGuide} />
        </div>
      )}
    </div>
  );
};

const HeaderButton = ({
  iconType,
  label,
  onClick,
  'data-test-subj': dataTestSubj,
}: {
  iconType: string;
  label: string;
  onClick: () => void;
  'data-test-subj': string;
}) => (
  <EuiToolTip content={label} disableScreenReaderOutput>
    <EuiButtonIcon
      iconType={iconType}
      color="text"
      onClick={onClick}
      aria-label={label}
      data-test-subj={dataTestSubj}
    />
  </EuiToolTip>
);

/** "⋯" menu of the panel header: export. */
const PanelMenu = () => {
  const controller = useComments();
  const zIndex = useLayerZIndex();
  const pending = useCommentsState((state) => state.pending);
  const [isOpen, setIsOpen] = useState(false);

  // Page clicks never reach EUI's outside-click detection in comment mode; they start a comment instead.
  useEffect(() => setIsOpen(false), [pending]);

  // Escape closes the open menu and nothing else. The layer handles Escape on
  // `document` in the capture phase; `window` comes before it in that phase.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen]);

  const run = (action: () => unknown) => () => {
    setIsOpen(false);
    void action();
  };

  const label = i18n.translate('devComments.panel.menu', {
    defaultMessage: 'More actions',
  });

  return (
    <EuiPopover
      aria-label={label}
      button={
        <HeaderButton
          iconType="ellipsis"
          label={label}
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj="devCommentsPanelMenu"
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="upRight"
      panelProps={ignoreProps}
      zIndex={zIndex.popover}
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="export"
            icon="download"
            onClick={run(() => controller.exportAll())}
            data-test-subj="devCommentsExport"
          >
            {i18n.translate('devComments.panel.export', { defaultMessage: 'Export all' })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

/**
 * Floating list of every comment, grouped by page with the current page first.
 * Selecting a comment opens its pin, or the thread inline when its element is
 * not on screen. Minimized, only the header with the comment count remains.
 */
export const CommentsPanel = () => {
  const controller = useComments();
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const zIndex = useLayerZIndex();
  const container = useLayerPortal('devCommentsPanel', zIndex.panel);
  const comments = useCommentsState((state) => state.comments);
  const pageKey = useCommentsState((state) => state.pageKey);
  const activeThreadId = useCommentsState((state) => state.activeThreadId);
  const minimized = useCommentsState((state) => state.panelMinimized);
  // Threads shown inline are those whose element is not on screen; a thread open from a pin never is.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const groups = useMemo(() => groupByPage(comments, pageKey), [comments, pageKey]);
  // Anchors are only looked up on their own page: another page's DOM could match them by accident.
  const resolvedAnchors = useResolvedAnchors();

  if (!container) {
    return null;
  }

  const select = (comment: Comment, element: Element | null) => {
    if (!element) {
      setExpandedId((current) => (current === comment.id ? null : comment.id));
      return;
    }
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    controller.openThread(comment.id, { focusPin: true });
    setExpandedId(null);
  };

  return createPortal(
    <EuiPanel
      paddingSize={minimized ? 'none' : 'm'}
      hasShadow
      css={css`
        position: fixed;
        right: ${euiTheme.size.base};
        bottom: ${euiTheme.size.xxxl};
        width: ${minimized ? 'auto' : '420px'};
        max-width: calc(100vw - ${euiTheme.size.xl});
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        pointer-events: auto;
        ${minimized
          ? `
            padding: ${euiTheme.size.m} ${euiTheme.size.l};
            border-radius: ${euiTheme.size.base};
          `
          : `border-radius: ${euiTheme.border.radius.medium};`}
      `}
      data-test-subj="devCommentsPanel"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{i18n.translate('devComments.panel.title', { defaultMessage: 'Comments' })}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiNotificationBadge
            color="subdued"
            aria-label={i18n.translate('devComments.panel.count', {
              defaultMessage: '{count, plural, one {# comment} other {# comments}}',
              values: { count: comments.length },
            })}
            css={css`
              align-self: flex-start;
            `}
            data-test-subj="devCommentsPanelCount"
          >
            {comments.length}
          </EuiNotificationBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <PanelMenu />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <HeaderButton
            iconType={minimized ? 'maximize' : 'minimize'}
            label={
              minimized
                ? i18n.translate('devComments.panel.maximize', { defaultMessage: 'Expand' })
                : i18n.translate('devComments.panel.minimize', { defaultMessage: 'Minimize' })
            }
            onClick={() => controller.setPanelMinimized(!minimized)}
            data-test-subj="devCommentsPanelMinimize"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <HeaderButton
            iconType="cross"
            label={i18n.translate('devComments.panel.close', {
              defaultMessage: 'Exit comment mode',
            })}
            onClick={() => controller.setActive(false)}
            data-test-subj="devCommentsPanelClose"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {!minimized && (
        <>
          <EuiSpacer size="s" />
          <div
            css={css`
              ${euiScrollBarStyles(euiThemeContext)}
              overflow: auto;
              min-height: 0;
              padding-right: ${euiTheme.size.xs};
            `}
          >
            {comments.length === 0 && (
              <EuiText size="s" color="subdued">
                {i18n.translate('devComments.panel.empty', {
                  defaultMessage: 'No comments yet. Click anywhere on the page to leave one.',
                })}
              </EuiText>
            )}
            {groups.map((group) => (
              <div key={group.pageKey} data-test-subj="devCommentsPanelPage">
                <EuiTitle size="xxs">
                  <h4
                    title={group.pageKey}
                    css={css`
                      font-family: ${euiTheme.font.familyCode};
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      padding: ${euiTheme.size.m} 0 ${euiTheme.size.xs};
                    `}
                  >
                    {group.pageKey}
                  </h4>
                </EuiTitle>
                {group.comments.map((comment) => {
                  const element = resolvedAnchors.get(comment.id)?.element ?? null;
                  return (
                    <PanelRow
                      key={comment.id}
                      comment={comment}
                      onScreen={element !== null}
                      expanded={expandedId === comment.id && element === null}
                      active={activeThreadId === comment.id}
                      onSelect={() => select(comment, element)}
                      onGuide={() => void controller.guideTo(comment)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </EuiPanel>,
    container
  );
};
