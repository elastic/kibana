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
import type { Annotation } from '../types';
import { useAnnotations, useAnnotationsState } from './annotations_context';
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
  annotations: Annotation[];
}

/** Comments by page, the current page first and the rest by page key. */
const groupByPage = (annotations: Annotation[], currentPageKey: string): PageGroup[] => {
  const groups = new Map<string, PageGroup>();
  annotations.forEach((annotation) => {
    const { pageKey } = annotation.route;
    const group = groups.get(pageKey) ?? { pageKey, annotations: [] };
    group.annotations.push(annotation);
    groups.set(pageKey, group);
  });
  return Array.from(groups.values()).sort((a, b) => {
    const aCurrent = a.pageKey === currentPageKey;
    const bCurrent = b.pageKey === currentPageKey;
    return aCurrent === bCurrent ? a.pageKey.localeCompare(b.pageKey) : aCurrent ? -1 : 1;
  });
};

const ThreadSizeBadge = ({ annotation }: { annotation: Annotation }) => {
  const count = threadSize(annotation);
  const label = i18n.translate('kbnUI.annotations.panel.threadSize', {
    defaultMessage: '{count, plural, one {# message} other {# messages}}',
    values: { count },
  });
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiBadge
        color={annotation.resolved ? 'success' : 'primary'}
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
  annotation,
  onScreen,
  expanded,
  active,
  onSelect,
  onGuide,
}: {
  annotation: Annotation;
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

  const guideLabel = i18n.translate('kbnUI.annotations.panel.notVisible', {
    defaultMessage: 'Not visible on this page. Click to navigate.',
  });

  return (
    <div
      ref={rowRef}
      css={css`
        border-bottom: ${euiTheme.border.thin};
        padding: ${euiTheme.size.xs} 0;
      `}
      data-test-subj={`kbnUiAnnotationsPanelItem-${annotation.id}`}
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
            <AuthorMeta author={annotation.author} at={annotation.createdAt} />
            <EuiSpacer size="xs" />
            <EuiText size="s" css={expanded ? commentTextStyles : clampedTextStyles}>
              {annotation.text}
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
          <ResolveButton annotation={annotation} />
          <ThreadSizeBadge annotation={annotation} />
          {onScreen ? (
            <EuiIconTip
              type="eye"
              color="primary"
              content={i18n.translate('kbnUI.annotations.panel.visible', {
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
                data-test-subj="kbnUiAnnotationsPanelGuide"
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
          <ThreadContent annotation={annotation} showComment={false} onGuide={onGuide} />
        </div>
      )}
    </div>
  );
};

const pickJsonFile = (): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.setAttribute(IGNORE_ATTR, 'true');
    input.style.display = 'none';
    const finish = () => {
      resolve(input.files?.[0] ?? null);
      input.remove();
    };
    input.addEventListener('change', finish);
    input.addEventListener('cancel', finish);
    document.body.appendChild(input);
    input.click();
  });

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

/** "⋯" menu of the panel header: export / import. */
const PanelMenu = () => {
  const controller = useAnnotations();
  const zIndex = useLayerZIndex();
  const pending = useAnnotationsState((state) => state.pending);
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

  const importFile = async () => {
    const file = await pickJsonFile();
    if (file) {
      await controller.importFile(file);
    }
  };

  const label = i18n.translate('kbnUI.annotations.panel.menu', {
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
          data-test-subj="kbnUiAnnotationsPanelMenu"
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
            data-test-subj="kbnUiAnnotationsExport"
          >
            {i18n.translate('kbnUI.annotations.panel.export', { defaultMessage: 'Export all' })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="import"
            icon="upload"
            onClick={run(importFile)}
            data-test-subj="kbnUiAnnotationsImport"
          >
            {i18n.translate('kbnUI.annotations.panel.import', { defaultMessage: 'Import…' })}
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
  const controller = useAnnotations();
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const zIndex = useLayerZIndex();
  const container = useLayerPortal('kbnUiAnnotationsPanel', zIndex.panel);
  const annotations = useAnnotationsState((state) => state.annotations);
  const pageKey = useAnnotationsState((state) => state.pageKey);
  const activeThreadId = useAnnotationsState((state) => state.activeThreadId);
  const minimized = useAnnotationsState((state) => state.panelMinimized);
  // Threads shown inline are those whose element is not on screen; a thread open from a pin never is.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const groups = useMemo(() => groupByPage(annotations, pageKey), [annotations, pageKey]);
  // Anchors are only looked up on their own page: another page's DOM could match them by accident.
  const resolvedAnchors = useResolvedAnchors();

  if (!container) {
    return null;
  }

  const select = (annotation: Annotation, element: Element | null) => {
    if (!element) {
      setExpandedId((current) => (current === annotation.id ? null : annotation.id));
      return;
    }
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    controller.openThread(annotation.id, { focusPin: true });
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
      data-test-subj="kbnUiAnnotationsPanel"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('kbnUI.annotations.panel.title', { defaultMessage: 'Comments' })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiNotificationBadge
            color="subdued"
            aria-label={i18n.translate('kbnUI.annotations.panel.count', {
              defaultMessage: '{count, plural, one {# comment} other {# comments}}',
              values: { count: annotations.length },
            })}
            css={css`
              align-self: flex-start;
            `}
            data-test-subj="kbnUiAnnotationsPanelCount"
          >
            {annotations.length}
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
                ? i18n.translate('kbnUI.annotations.panel.maximize', { defaultMessage: 'Expand' })
                : i18n.translate('kbnUI.annotations.panel.minimize', { defaultMessage: 'Minimize' })
            }
            onClick={() => controller.setPanelMinimized(!minimized)}
            data-test-subj="kbnUiAnnotationsPanelMinimize"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <HeaderButton
            iconType="cross"
            label={i18n.translate('kbnUI.annotations.panel.close', {
              defaultMessage: 'Exit comment mode',
            })}
            onClick={() => controller.setActive(false)}
            data-test-subj="kbnUiAnnotationsPanelClose"
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
            {annotations.length === 0 && (
              <EuiText size="s" color="subdued">
                {i18n.translate('kbnUI.annotations.panel.empty', {
                  defaultMessage: 'No comments yet. Click anywhere on the page to leave one.',
                })}
              </EuiText>
            )}
            {groups.map((group) => (
              <div key={group.pageKey} data-test-subj="kbnUiAnnotationsPanelPage">
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
                {group.annotations.map((annotation) => {
                  const element = resolvedAnchors.get(annotation.id)?.element ?? null;
                  return (
                    <PanelRow
                      key={annotation.id}
                      annotation={annotation}
                      onScreen={element !== null}
                      expanded={expandedId === annotation.id && element === null}
                      active={activeThreadId === annotation.id}
                      onSelect={() => select(annotation, element)}
                      onGuide={() => void controller.guideTo(annotation)}
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
