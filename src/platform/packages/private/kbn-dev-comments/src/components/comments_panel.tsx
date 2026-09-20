/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiScrollBarStyles,
  getDefaultEuiMarkdownProcessingPlugins,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { Comment } from '../types';
import { useComments, useCommentsState } from './comments_context';
import { useLayerPortal, useLayerZIndex } from './hooks';
import { threadSize } from './pins_layer';
import { useResolvedAnchors } from './resolved_anchors';
import { RefreshButton, ResolveButton, ThreadContent } from './thread_content';

const previewStyles = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

const PreviewLink = ({ children }: PropsWithChildren) => <>{children}</>;

const previewProcessingPlugins = (() => {
  const plugins = getDefaultEuiMarkdownProcessingPlugins();
  plugins[1][1].components.a = PreviewLink;
  return plugins;
})();

/** The first lines of a comment, rendered. Links are text only: the preview sits in the row's button, which can hold no other control. */
const CommentPreview = ({ text }: { text: string }) => (
  <EuiMarkdownFormat
    textSize="s"
    processingPluginList={previewProcessingPlugins}
    css={previewStyles}
  >
    {text}
  </EuiMarkdownFormat>
);

interface PageGroup {
  pageKey: string;
  comments: Comment[];
}

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

/** A count of comments with what it counts in a tooltip, which the badge can be focused to show. */
const CountBadge = ({
  count,
  label,
  'data-test-subj': dataTestSubj,
}: {
  count: number;
  label: string;
  'data-test-subj'?: string;
}) => (
  <EuiToolTip
    content={label}
    disableScreenReaderOutput
    anchorProps={{
      css: css`
        align-self: flex-start;
      `,
    }}
  >
    <EuiNotificationBadge
      color="subdued"
      aria-label={label}
      tabIndex={0}
      data-test-subj={dataTestSubj}
    >
      {count}
    </EuiNotificationBadge>
  </EuiToolTip>
);

const ThreadSizeBadge = ({ comment }: { comment: Comment }) => {
  const count = threadSize(comment);
  const label = i18n.translate('devComments.panel.threadSize', {
    defaultMessage: '{count, plural, one {# comment} other {# comments}} in this thread',
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

const PageGroup = ({
  pageKey,
  count,
  children,
}: PropsWithChildren<{ pageKey: string; count: number }>) => {
  const { euiTheme } = useEuiTheme();
  const [open, setOpen] = useState(true);
  const contentId = useGeneratedHtmlId({ prefix: 'devCommentsPanelPage' });

  return (
    <section
      css={css`
        padding-top: ${euiTheme.size.s};
      `}
      data-test-subj="devCommentsPanelPage"
    >
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          position: sticky;
          top: 0;
          z-index: ${euiTheme.levels.header};
          padding: ${euiTheme.size.xs} ${euiTheme.size.s};
          border-radius: ${euiTheme.border.radius.medium};
          background: ${euiTheme.colors.backgroundBasePrimary};
          &:hover {
            background: ${euiTheme.colors.backgroundLightPrimary};
          }
        `}
      >
        <EuiFlexItem
          css={css`
            /* The path is truncated; a flex item would otherwise refuse to shrink below it. */
            min-width: 0;
          `}
        >
          <EuiButtonEmpty
            size="xs"
            color="text"
            flush="left"
            iconType={open ? 'chevronSingleDown' : 'chevronSingleRight'}
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={contentId}
            title={pageKey}
            contentProps={{
              css: css`
                justify-content: flex-start;
              `,
            }}
            textProps={{
              css: css`
                font-family: ${euiTheme.font.familyCode};
                font-weight: ${euiTheme.font.weight.bold};
              `,
            }}
          >
            {pageKey}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CountBadge
            count={count}
            label={i18n.translate('devComments.panel.pageCount', {
              defaultMessage: '{count, plural, one {# comment} other {# comments}} on this page',
              values: { count },
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div id={contentId}>{open && children}</div>
    </section>
  );
};

const PanelRow = ({
  comment,
  visible,
  expanded,
  active,
  list,
  onSelect,
  onToggle,
  onGuide,
}: {
  comment: Comment;
  /** The element shows on the page, with the pin the thread opens at; not under a dialog or menu, and not off the page. */
  visible: boolean;
  /** The thread is shown in the row, below the comment. */
  expanded: boolean;
  /** The row's thread is the one currently open from a pin. */
  active: boolean;
  /** The scrolling list the row is in. */
  list: RefObject<HTMLDivElement>;
  /** The comment was picked: its thread opens at its pin when the element is visible, in the row otherwise. */
  onSelect: () => void;
  /** Shows the thread in the row, or hides it. */
  onToggle: () => void;
  onGuide: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const rowRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Brings the row into view by scrolling the list, and only the list: `scrollIntoView`
  // would also scroll the page under the panel when the list cannot scroll far enough.
  // Expanded, the row goes to the top (below the page's sticky header), once its thread
  // has laid out; the row of the thread open from a pin only comes into view.
  useEffect(() => {
    if (!expanded && !active) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const row = rowRef.current;
      const scroller = list.current;
      if (!row || !scroller) {
        return;
      }
      const headerHeight = parseFloat(euiTheme.size.xl);
      const top =
        row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const bottom = top + row.offsetHeight;
      if (expanded || top - headerHeight < scroller.scrollTop) {
        scroller.scrollTop = top - headerHeight;
      } else if (bottom > scroller.scrollTop + scroller.clientHeight) {
        scroller.scrollTop = bottom - scroller.clientHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded, active, list, euiTheme.size.xl]);

  // Opened from the preview, which the text then replaces, focus moves on to the toggle that closes the thread.
  useEffect(() => {
    if (expanded && (document.activeElement === null || document.activeElement === document.body)) {
      toggleRef.current?.focus({ preventScroll: true });
    }
  }, [expanded]);

  const openLabel = i18n.translate('devComments.panel.visible', {
    defaultMessage: 'Visible - click to open',
  });
  const guideLabel = i18n.translate('devComments.panel.notVisible', {
    defaultMessage: 'Not visible - click to navigate',
  });
  const toggleLabel = expanded
    ? i18n.translate('devComments.panel.collapseThread', {
        defaultMessage: 'Collapse this thread',
      })
    : i18n.translate('devComments.panel.expandThread', {
        defaultMessage: 'Expand this thread',
      });

  const actions = (
    <>
      <ResolveButton comment={comment} />
      <ThreadSizeBadge comment={comment} />
      {visible ? (
        <EuiToolTip content={openLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="eye"
            size="xs"
            onClick={onSelect}
            aria-label={openLabel}
            data-test-subj="devCommentsPanelOpen"
          />
        </EuiToolTip>
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
      <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType={expanded ? 'minimize' : 'maximize'}
          color="text"
          size="xs"
          buttonRef={toggleRef}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={toggleLabel}
          data-test-subj="devCommentsPanelToggle"
        />
      </EuiToolTip>
    </>
  );

  return (
    <div
      ref={rowRef}
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.xs};
        border-bottom: ${euiTheme.border.thin};
        /* The open thread is marked by a bar along its edge, a small gap from the avatars. The
           bar has its room on every row, so nothing moves when it shows. */
        border-left: ${euiTheme.border.width.thick} solid transparent;
        ${expanded && `border-left-color: ${euiTheme.colors.primary};`}
      `}
      data-test-subj={`devCommentsPanelItem-${comment.id}`}
    >
      <ThreadContent
        comment={comment}
        inline
        rootActions={actions}
        folded={
          expanded ? undefined : (
            <EuiPanel
              element="button"
              type="button"
              paddingSize="none"
              borderRadius="none"
              color="transparent"
              hasShadow={false}
              onClick={onSelect}
              aria-expanded={visible ? undefined : false}
              css={css`
                text-align: left;
                /* Text in a row, not a card: it does not lift (shadow, and a border in dark mode) on hover or focus. */
                &:hover,
                &:focus {
                  box-shadow: none;
                  transform: none;
                  &::after {
                    content: none;
                  }
                }
                &:hover,
                &:focus-visible {
                  background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
                }
              `}
              data-test-subj="devCommentsPanelPreview"
            >
              <CommentPreview text={comment.text} />
            </EuiPanel>
          )
        }
      />
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
  const loaded = useCommentsState((state) => state.loaded);
  const loadError = useCommentsState((state) => state.loadError);
  const pageKey = useCommentsState((state) => state.pageKey);
  const activeThreadId = useCommentsState((state) => state.activeThreadId);
  const minimized = useCommentsState((state) => state.panelMinimized);
  // Threads shown inline are those whose element is not on screen; a thread open from a pin never is.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupByPage(comments, pageKey), [comments, pageKey]);
  // Anchors are only looked up on their own page: another page's DOM could match them by accident.
  const resolvedAnchors = useResolvedAnchors();

  if (!container) {
    return null;
  }

  const toggle = (comment: Comment) =>
    setExpandedId((current) => (current === comment.id ? null : comment.id));

  const select = (comment: Comment, element: Element | null) => {
    if (!element) {
      toggle(comment);
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
          {loaded && (
            <CountBadge
              count={comments.length}
              label={i18n.translate('devComments.panel.count', {
                defaultMessage: '{count, plural, one {# comment} other {# comments}} total',
                values: { count: comments.length },
              })}
              data-test-subj="devCommentsPanelCount"
            />
          )}
        </EuiFlexItem>
        {!minimized && (
          <EuiFlexItem grow={false}>
            <RefreshButton
              label={i18n.translate('devComments.panel.refresh', {
                defaultMessage: 'Refresh comments',
              })}
              data-test-subj="devCommentsPanelRefresh"
            />
          </EuiFlexItem>
        )}
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
            ref={listRef}
            css={css`
              ${euiScrollBarStyles(euiThemeContext)}
              overflow: auto;
              min-height: 0;
              padding-right: ${euiTheme.size.xs};
            `}
          >
            {loadError !== null && (
              <KbnDangerCallout
                announceOnMount
                size="s"
                title={i18n.translate('devComments.panel.loadFailed', {
                  defaultMessage: 'Could not load comments',
                })}
                text={loadError}
                actionProps={{
                  primary: {
                    children: i18n.translate('devComments.panel.retry', {
                      defaultMessage: 'Retry',
                    }),
                    onClick: () => void controller.reload(),
                    'data-test-subj': 'devCommentsPanelRetry',
                  },
                }}
                data-test-subj="devCommentsPanelLoadError"
              />
            )}
            {!loaded && loadError === null && (
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                justifyContent="center"
                responsive={false}
                data-test-subj="devCommentsPanelLoading"
              >
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {i18n.translate('devComments.panel.loading', {
                      defaultMessage: 'Loading comments…',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
            {loaded && loadError === null && comments.length === 0 && (
              <EuiText size="s" color="subdued">
                {i18n.translate('devComments.panel.empty', {
                  defaultMessage: 'No comments yet. Click anywhere on the page to leave one.',
                })}
              </EuiText>
            )}
            {groups.map((group) => (
              <PageGroup key={group.pageKey} pageKey={group.pageKey} count={group.comments.length}>
                {group.comments.map((comment) => {
                  const placed = resolvedAnchors.get(comment.id);
                  const element = placed?.exposed ? placed.element : null;
                  return (
                    <PanelRow
                      key={comment.id}
                      comment={comment}
                      visible={element !== null}
                      expanded={expandedId === comment.id}
                      active={activeThreadId === comment.id}
                      list={listRef}
                      onSelect={() => select(comment, element)}
                      onToggle={() => toggle(comment)}
                      onGuide={() => void controller.guideTo(comment)}
                    />
                  );
                })}
              </PageGroup>
            ))}
          </div>
        </>
      )}
    </EuiPanel>,
    container
  );
};
