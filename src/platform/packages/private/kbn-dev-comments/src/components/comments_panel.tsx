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
  type KeyboardEvent,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  copyToClipboard,
  euiScrollBarStyles,
  getDefaultEuiMarkdownProcessingPlugins,
  useEuiFontSize,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { isInTooltip } from '../lib/anchor';
import type { Comment } from '../types';
import { useComments, useCommentsState } from './comments_context';
import {
  containProps,
  menuPanelProps,
  useLayerPortal,
  useLayerZIndex,
  usePanelZIndex,
} from './hooks';
import { useResolvedAnchors } from './resolved_anchors';
import { ResolveButton, ThreadContent, TimeLabel } from './thread_content';

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
    textSize="xs"
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

/** A button and the menu it opens: "more actions" unless told otherwise. */
const ActionsMenu = ({
  label,
  items,
  isOpen,
  setOpen,
  iconType = 'boxesVertical',
  color = 'text',
  display,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  items: (close: () => void) => ReactElement[];
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  iconType?: string;
  color?: 'text' | 'primary';
  display?: 'empty' | 'base';
  'data-test-subj': string;
}) => {
  const close = () => setOpen(false);
  const { popover: zIndex } = useLayerZIndex();
  const panelRef = usePanelZIndex(zIndex);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Escape closes the menu, focus back on its button; comment mode leaves the key to it.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      buttonRef.current?.focus();
    }
  };
  return (
    <EuiPopover
      aria-label={label}
      isOpen={isOpen}
      closePopover={close}
      panelPaddingSize="none"
      anchorPosition="downRight"
      // Portalled to `body`, the menu is marked as the layer's, and its clicks kept from the page. `element`: EuiPanel would render a button given handlers.
      panelProps={{ ...menuPanelProps, ...containProps, onKeyDown, element: 'div' }}
      panelRef={panelRef}
      zIndex={zIndex}
      button={
        <EuiToolTip content={label} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={iconType}
            color={color}
            display={display}
            size="xs"
            buttonRef={buttonRef}
            onClick={() => setOpen(!isOpen)}
            aria-label={label}
            data-test-subj={dataTestSubj}
          />
        </EuiToolTip>
      }
    >
      {/* Not to be wrapped: EuiContextMenuPanel finds its popover by DOM position. */}
      <EuiContextMenuPanel items={items(close)} />
    </EuiPopover>
  );
};

/** The page a comment was made on, as the heading of what is shown of it. */
const PagePath = ({
  pageKey,
  element: Element = 'h4',
}: {
  pageKey: string;
  /** A span in an accordion's button, which can hold no heading. */
  element?: 'h4' | 'span';
}) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize, lineHeight } = useEuiFontSize('xxs');
  return (
    <Element
      title={pageKey}
      css={css`
        display: block;
        min-width: 0;
        font-family: ${euiTheme.font.familyCode};
        font-size: ${fontSize};
        line-height: ${lineHeight};
        font-weight: ${euiTheme.font.weight.bold};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `}
    >
      {pageKey}
    </Element>
  );
};

/** The comments of a page under its path, which opens and closes them; opens on its own on arriving at the page. */
const PageGroup = ({
  pageKey,
  count,
  defaultOpen,
  children,
}: PropsWithChildren<{ pageKey: string; count: number; defaultOpen: boolean }>) => {
  const { euiTheme } = useEuiTheme();
  const id = useGeneratedHtmlId({ prefix: 'devCommentsPanelPage' });
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);

  return (
    <section
      css={css`
        margin-block-start: ${euiTheme.size.m};
      `}
      data-page-key={pageKey}
      data-test-subj="devCommentsPanelPage"
    >
      <EuiAccordion
        id={id}
        forceState={open ? 'open' : 'closed'}
        onToggle={setOpen}
        buttonContent={<PagePath pageKey={pageKey} element="span" />}
        buttonProps={{
          css: css`
            min-width: 0;
          `,
        }}
        buttonContentClassName="eui-textTruncate"
        extraAction={
          <EuiNotificationBadge
            color="subdued"
            aria-label={i18n.translate('devComments.panel.pageCount', {
              defaultMessage: '{count, plural, one {# comment} other {# comments}}',
              values: { count },
            })}
          >
            {count}
          </EuiNotificationBadge>
        }
      >
        {/* Only while open: the rows of a closed page are not in the way of the keyboard. */}
        {open && children}
      </EuiAccordion>
    </section>
  );
};

/** A thread in place of the list, screenshot shown: for a comment whose element cannot be shown. */
const PanelThread = ({ comment, onBack }: { comment: Comment; onBack: () => void }) => {
  const backRef = useRef<HTMLButtonElement>(null);
  const backLabel = i18n.translate('devComments.panel.back', {
    defaultMessage: 'Back to comments',
  });

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
  }, [comment.id]);

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={backLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="chevronSingleLeft"
              color="text"
              size="xs"
              buttonRef={backRef}
              onClick={onBack}
              aria-label={backLabel}
              data-test-subj="devCommentsPanelBack"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <PagePath pageKey={comment.route.pageKey} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div
        css={css`
          display: flex;
          flex-direction: column;
          min-height: 0;
        `}
        data-test-subj="devCommentsPanelThread"
      >
        <ThreadContent comment={comment} showScreenshot={comment.snapshot !== undefined} />
      </div>
    </>
  );
};

/** A comment in the list; the whole row takes the reader to it (its pin, or the guide). Its actions show on hover or focus. */
const PanelRow = ({
  comment,
  visible,
  active,
  onSelect,
  onShow,
}: {
  comment: Comment;
  /** The element shows on the page, with the pin the thread opens at; not under a dialog or menu, and not off the page. */
  visible: boolean;
  /** The row's thread is the one currently open from a pin. */
  active: boolean;
  onSelect: () => void;
  /** Shows the thread in the panel, in place of the list. */
  onShow: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const metaFont = useEuiFontSize('xxs');
  const rowRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // The active row comes into view; `scrollIntoView` would scroll the page under the panel too.
  useEffect(() => {
    const row = rowRef.current;
    const list = row?.parentElement?.closest<HTMLElement>('[data-comments-list]');
    if (!active || !row || !list) {
      return;
    }
    const top = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [active]);

  const notVisibleLabel = i18n.translate('devComments.panel.notVisible', {
    defaultMessage: 'Comment not visible on this page',
  });
  const replies = comment.replies.length;

  // Resolved, the row may leave the list with the focus: it moves on to the next row,
  // the previous one, or the filter that hid it, decided while the row is still there.
  const focusAfterResolve = useRef<HTMLElement | null>(null);
  const rememberFocusTarget = () => {
    const row = rowRef.current;
    const panel = row?.closest('[data-test-subj="devCommentsPanel"]');
    if (!row || !panel) {
      return;
    }
    const rows = Array.from(
      panel.querySelectorAll<HTMLElement>('[data-test-subj^="devCommentsPanelItem-"] > button')
    );
    const index = rows.findIndex((button) => row.contains(button));
    focusAfterResolve.current =
      rows[index + 1] ??
      rows[index - 1] ??
      panel.querySelector<HTMLElement>('[data-test-subj="devCommentsPanelFilter"]');
  };
  const restoreFocus = () =>
    requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (!focused || focused === document.body || !focused.isConnected) {
        focusAfterResolve.current?.focus();
      }
    });

  return (
    <div
      ref={rowRef}
      css={css`
        position: relative;
        display: flex;
        gap: ${euiTheme.size.s};
        padding-block: ${euiTheme.size.s};
        /* Flush with the page path above; room for the actions at the end. */
        padding-inline: 0 ${euiTheme.size.s};
        border-block-end: ${euiTheme.border.thin};
        ${active && `background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};`}
        &:hover,
        &:focus-within {
          background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
        .devCommentsPanelRowActions {
          opacity: ${menuOpen ? 1 : 0};
        }
        &:hover .devCommentsPanelRowActions,
        &:focus-within .devCommentsPanelRowActions {
          opacity: 1;
        }
      `}
      data-test-subj={`devCommentsPanelItem-${comment.id}`}
      data-comment-id={comment.id}
    >
      <button
        type="button"
        onClick={onSelect}
        css={css`
          flex: 1 1 auto;
          min-width: 0;
          text-align: left;
          /* The whole row is the button's target; the actions sit above it. */
          &::after {
            content: '';
            position: absolute;
            inset: 0;
          }
          &:focus-visible {
            outline: none;
          }
          &:focus-visible::after {
            outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
            outline-offset: -${euiTheme.focus.width};
          }
        `}
        data-test-subj="devCommentsPanelPreview"
      >
        <EuiText size="xs">
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <strong>{comment.author.displayName}</strong>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                size="relative"
                color="subdued"
                css={css`
                  font-size: ${metaFont.fontSize};
                  line-height: ${metaFont.lineHeight};
                `}
              >
                <TimeLabel at={comment.createdAt} />
              </EuiText>
            </EuiFlexItem>
            {!visible && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="eyeSlash"
                  color="subdued"
                  content={notVisibleLabel}
                  aria-label={notVisibleLabel}
                  disableScreenReaderOutput
                  // Raised above the row button's click target, to be hovered.
                  iconProps={{ tabIndex: -1, 'data-test-subj': 'devCommentsPanelNotVisible' }}
                  anchorProps={{
                    css: css`
                      position: relative;
                      z-index: 1;
                    `,
                  }}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiText>
        <CommentPreview text={comment.text} />
        {replies > 0 && (
          <EuiText
            size="relative"
            color={euiTheme.colors.textPrimary}
            css={css`
              font-size: ${metaFont.fontSize};
              line-height: ${metaFont.lineHeight};
            `}
          >
            {i18n.translate('devComments.panel.replies', {
              defaultMessage: '{count, plural, one {# reply} other {# replies}}',
              values: { count: replies },
            })}
          </EuiText>
        )}
      </button>
      <div
        className="devCommentsPanelRowActions"
        css={css`
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: ${euiTheme.size.xs};
        `}
      >
        <ActionsMenu
          label={i18n.translate('devComments.panel.rowActions', {
            defaultMessage: 'More actions',
          })}
          isOpen={menuOpen}
          setOpen={setMenuOpen}
          data-test-subj="devCommentsPanelRowActions"
          items={(close) => [
            <EuiContextMenuItem
              key="show"
              icon="comment"
              onClick={() => {
                close();
                onShow();
              }}
              data-test-subj="devCommentsPanelShow"
            >
              {i18n.translate('devComments.panel.viewThread', { defaultMessage: 'View thread' })}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="copy"
              icon="copy"
              onClick={() => {
                copyToClipboard(comment.text);
                close();
              }}
              data-test-subj="devCommentsCopy"
            >
              {i18n.translate('devComments.panel.copy', { defaultMessage: 'Copy' })}
            </EuiContextMenuItem>,
          ]}
        />
        <div onClickCapture={rememberFocusTarget}>
          <ResolveButton comment={comment} onSettled={restoreFocus} />
        </div>
      </div>
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
 * Floating list of every comment, grouped by page, the current page first.
 * Selecting one opens its pin, or guides to it; a thread can also be shown in
 * the panel, in place of the list. Minimized, only the header remains.
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
  const panelThreadId = useCommentsState((state) => state.panelThreadId);
  const panelThread = comments.find((comment) => comment.id === panelThreadId);

  // Back in the list, focus returns to the row the thread was shown from; failing
  // that (its page closed, the thread filtered out), to its page or the filter.
  const shownThread = useRef<Comment | null>(null);
  useEffect(() => {
    if (panelThread) {
      shownThread.current = panelThread;
      return;
    }
    const left = shownThread.current;
    shownThread.current = null;
    if (!left || !container) {
      return;
    }
    requestAnimationFrame(() => {
      const page = Array.from(
        container.querySelectorAll<HTMLElement>('[data-test-subj="devCommentsPanelPage"]')
      ).find((section) => section.dataset.pageKey === left.route.pageKey);
      // Compared as strings: a selector built from the host's ids could be invalid.
      const row = Array.from(
        container.querySelectorAll<HTMLElement>('[data-test-subj^="devCommentsPanelItem-"]')
      ).find((element) => element.dataset.commentId === left.id);
      const target =
        row?.querySelector<HTMLElement>(':scope > button') ??
        // The accordion's trigger, not its arrow, which is out of the tab order.
        page?.querySelector<HTMLElement>('button[aria-expanded]:not([tabindex="-1"])') ??
        container.querySelector<HTMLElement>('[data-test-subj="devCommentsPanelFilter"]');
      target?.focus();
    });
  }, [panelThread, container]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  // Resolved comments leave the list as soon as they are resolved, unless asked for.
  const [showResolved, setShowResolved] = useState(false);
  const resolvedCount = useMemo(
    () => comments.filter((comment) => comment.resolved).length,
    [comments]
  );
  const listed = useMemo(
    () => (showResolved ? comments : comments.filter((comment) => !comment.resolved)),
    [comments, showResolved]
  );
  const groups = useMemo(() => groupByPage(listed, pageKey), [listed, pageKey]);
  // Anchors are only looked up on their own page: another page's DOM could match them by accident.
  const resolvedAnchors = useResolvedAnchors();

  if (!container) {
    return null;
  }

  const select = (comment: Comment, element: Element | null) => {
    if (!element) {
      void controller.guideTo(comment);
      return;
    }
    // Focusing the pin would blur the element, and a tooltip shown for its focus would go, pin and all.
    if (isInTooltip(element)) {
      controller.openThread(comment.id, { focusPin: false });
      return;
    }
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    controller.openThread(comment.id, { focusPin: true });
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
        ${
          minimized
            ? `
            padding: ${euiTheme.size.m} ${euiTheme.size.l};
            border-radius: ${euiTheme.size.base};
          `
            : `border-radius: ${euiTheme.border.radius.medium};`
        }
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
            <div>
              <EuiNotificationBadge color="subdued" data-test-subj="devCommentsPanelCount">
                {listed.length}
              </EuiNotificationBadge>
            </div>
          )}
        </EuiFlexItem>
        {!minimized && !panelThread && (
          <EuiFlexItem grow={false}>
            <ActionsMenu
              label={i18n.translate('devComments.panel.actions', {
                defaultMessage: 'More actions',
              })}
              isOpen={menuOpen}
              setOpen={setMenuOpen}
              data-test-subj="devCommentsPanelActions"
              items={(close) => [
                <EuiContextMenuItem
                  key="refresh"
                  icon="refresh"
                  onClick={() => {
                    void controller.reload();
                    close();
                  }}
                  data-test-subj="devCommentsPanelRefresh"
                >
                  {i18n.translate('devComments.panel.refresh', {
                    defaultMessage: 'Refresh',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiFlexItem>
        )}
        {!minimized && !panelThread && (
          <EuiFlexItem grow={false}>
            <ActionsMenu
              label={i18n.translate('devComments.panel.filter', {
                defaultMessage: 'Filter comments',
              })}
              iconType="filter"
              color="primary"
              // On while it is hiding comments.
              display={!showResolved && resolvedCount > 0 ? 'base' : 'empty'}
              isOpen={filterOpen}
              setOpen={setFilterOpen}
              data-test-subj="devCommentsPanelFilter"
              items={(close) => [
                <EuiContextMenuItem
                  key="showResolved"
                  icon={showResolved ? 'check' : 'empty'}
                  role="menuitemcheckbox"
                  aria-checked={showResolved}
                  onClick={() => {
                    setShowResolved((value) => !value);
                    close();
                  }}
                  data-test-subj="devCommentsPanelShowResolved"
                >
                  {i18n.translate('devComments.panel.showResolved', {
                    defaultMessage: 'Show resolved comments',
                  })}
                </EuiContextMenuItem>,
              ]}
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
      {!minimized && panelThread && (
        <>
          <EuiSpacer size="m" />
          <PanelThread comment={panelThread} onBack={() => controller.showInPanel(null)} />
        </>
      )}
      {!minimized && !panelThread && (
        <>
          <EuiSpacer size="s" />
          <div
            data-comments-list
            css={css`
              ${euiScrollBarStyles(euiThemeContext)}
              overflow: auto;
              min-height: 0;
              padding-inline-end: ${euiTheme.size.xs};
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
            {loaded && loadError === null && comments.length > 0 && listed.length === 0 && (
              <EuiText size="s" color="subdued" data-test-subj="devCommentsPanelAllResolved">
                {i18n.translate('devComments.panel.allResolved', {
                  defaultMessage: 'All comments are resolved.',
                })}
              </EuiText>
            )}
            {groups.map((group) => (
              <PageGroup
                key={group.pageKey}
                pageKey={group.pageKey}
                count={group.comments.length}
                // The current page's comments are open, or the only page's; the others are an index.
                defaultOpen={group.pageKey === pageKey || groups.length === 1}
              >
                {group.comments.map((comment) => {
                  const placed = resolvedAnchors.get(comment.id);
                  const element = placed?.exposed ? placed.element : null;
                  return (
                    <PanelRow
                      key={comment.id}
                      comment={comment}
                      visible={element !== null}
                      active={activeThreadId === comment.id}
                      onSelect={() => select(comment, element)}
                      onShow={() => controller.showInPanel(comment.id)}
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
