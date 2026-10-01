/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiHighlight,
  EuiIcon,
  EuiInlineEditText,
  EuiLink,
  EuiScreenReaderOnly,
  EuiToolTip,
  euiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PublishesWritableTitle, ViewMode } from '@kbn/presentation-publishing';
import { apiPublishesWritableTitle } from '@kbn/presentation-publishing';
import type { CustomizePanelActionApi } from '../../../ui_actions/customize_panel_action';
import { isApiCompatibleWithCustomizePanelAction } from '../../../ui_actions/customize_panel_action';
import { openCustomizePanelFlyout } from '../../../ui_actions/customize_panel_action/open_customize_panel';

const InlineEditablePanelTitle = ({
  api,
  panelTitle,
}: {
  api: PublishesWritableTitle;
  panelTitle: string;
}) => {
  const { euiTheme } = useEuiTheme();
  /** Width of the full, untruncated title in read mode. Only set while editing. */
  const [titleWidth, setTitleWidth] = useState<number | undefined>();
  const isEditing = titleWidth !== undefined;

  const onStartEditing = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const text = button.querySelector('.euiButtonEmpty__text');
    // account for the part of the title hidden by truncation
    const hiddenWidth = text ? text.scrollWidth - text.clientWidth : 0;
    setTitleWidth(button.offsetWidth + hiddenWidth);
  }, []);
  const onStopEditing = useCallback(() => setTitleWidth(undefined), []);

  const onSave = useCallback(
    (value: string) => {
      const newTitle = value.trim();
      // An empty title or one matching the default title is stored as undefined, so the panel
      // keeps in sync with the title of the saved object
      api.setTitle(!newTitle || newTitle === api.defaultTitle$?.value ? undefined : newTitle);
      onStopEditing();
    },
    [api, onStopEditing]
  );

  return (
    <span
      // prevents the dashboard grid from starting a panel drag while editing the title
      data-kbn-grid-no-drag={isEditing || undefined}
      css={css`
        display: block;
        min-width: 0;
        ${isEditing
          ? // size the input to fit the whole title plus the save and cancel buttons,
            // without growing past the space available in the header
            `
              width: calc(${titleWidth}px + ${euiTheme.size.xl} * 2 + ${euiTheme.size.s} * 2);
              min-width: calc(${euiTheme.size.base} * 12);
              max-width: 100%;
            `
          : ''}

        .kbnGridPanel--active & {
          pointer-events: none; // prevent drag event from triggering edit mode
        }
        [data-test-subj='embeddablePanelTitle'] .euiText {
          font-weight: ${euiTheme.font.weight.medium};
        }
        // only show the pencil when hovering the panel (or its hover actions) or focusing the
        // title. Keep its space so the title doesn't shift when it appears. Uses visibility
        // because EUI fades icons in with an opacity animation, which would override opacity
        [data-test-subj='embeddablePanelTitle'] .euiIcon {
          visibility: hidden;
        }
        .embPanel__hoverActionsAnchor:hover & [data-test-subj='embeddablePanelTitle'] .euiIcon,
        .embPanel:hover & [data-test-subj='embeddablePanelTitle'] .euiIcon,
        [data-test-subj='embeddablePanelTitle']:focus-visible .euiIcon {
          visibility: visible;
        }
      `}
    >
      <EuiInlineEditText
        // remount when the title changes elsewhere (e.g. the settings flyout)
        key={panelTitle}
        size="s"
        defaultValue={panelTitle}
        inputAriaLabel={i18n.translate('embeddableApi.header.titleInputAriaLabel', {
          defaultMessage: 'Edit panel title',
        })}
        onSave={onSave}
        onCancel={onStopEditing}
        readModeProps={{
          'data-test-subj': 'embeddablePanelTitle',
          'aria-label': i18n.translate('embeddableApi.header.titleAriaLabel', {
            defaultMessage: 'Click to edit title: {title}',
            values: { title: panelTitle },
          }),
          onClick: onStartEditing,
        }}
        editModeProps={{
          inputProps: { 'data-test-subj': 'embeddablePanelTitleInput' },
        }}
      />
    </span>
  );
};

export const PresentationPanelTitle = ({
  api,
  headerId,
  viewMode,
  hideTitle,
  panelTitle,
  panelDescription,
  titleHighlight,
}: {
  api: unknown;
  headerId: string;
  hideTitle?: boolean;
  panelTitle?: string;
  panelDescription?: string;
  viewMode?: ViewMode;
  titleHighlight?: string | string[];
}) => {
  const { euiTheme } = useEuiTheme();
  const isEditableTitle = viewMode === 'edit' && isApiCompatibleWithCustomizePanelAction(api);

  const onClick = useCallback(() => {
    openCustomizePanelFlyout({
      api: api as CustomizePanelActionApi,
      focusOnTitle: true,
    });
  }, [api]);

  /**
   * Ensures the flyout opens on Enter across all browsers, since some browsers (e.g. Safari)
   * do not fire click events when Enter is pressed on <a> elements without an href.
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // prevent `onClick` event from firing and causing a double flyout
        onClick();
      }
    },
    [onClick]
  );

  const panelTitleElement = useMemo(() => {
    if (hideTitle) return null;

    const titleStyles = css`
      ${euiTextTruncate()};
      font-weight: ${euiTheme.font.weight.medium};

      .kbnGridPanel--active & {
        pointer-events: none; // prevent drag event from triggering onClick
      }
    `;

    const titleContent =
      titleHighlight && panelTitle ? (
        <EuiHighlight strict={false} highlightAll search={titleHighlight}>
          {panelTitle ?? ''}
        </EuiHighlight>
      ) : (
        panelTitle
      );

    if (isEditableTitle && panelTitle && !titleHighlight && apiPublishesWritableTitle(api)) {
      return <InlineEditablePanelTitle api={api} panelTitle={panelTitle} />;
    }

    if (!isEditableTitle) {
      return (
        <span data-test-subj="embeddablePanelTitle" css={titleStyles}>
          {titleContent}
        </span>
      );
    }

    return (
      <EuiLink
        color="text"
        onClick={onClick}
        onKeyDown={onKeyDown}
        css={titleStyles}
        aria-label={i18n.translate('embeddableApi.header.titleAriaLabel', {
          defaultMessage: 'Click to edit title: {title}',
          values: { title: panelTitle },
        })}
        data-test-subj="embeddablePanelTitle"
      >
        {titleContent}
      </EuiLink>
    );
  }, [
    api,
    onClick,
    onKeyDown,
    hideTitle,
    panelTitle,
    isEditableTitle,
    euiTheme.font.weight.medium,
    titleHighlight,
  ]);

  const describedPanelTitleElement = useMemo(() => {
    if (hideTitle) return null;
    if (!panelTitleElement) return null;

    if (!panelDescription) {
      if (!panelTitle) return panelTitleElement;

      return (
        <EuiToolTip
          content={panelTitle}
          position="top"
          display="block"
          anchorProps={{
            'data-test-subj': 'embeddablePanelTitleTooltipAnchor',
          }}
        >
          {/* A block container is required for text-overflow:ellipsis to fire (inline elements do not
              produce ellipsis). In edit mode the EuiLink inside is focusable via <a> and its focus
              events bubble to the tooltip anchor, so no tabIndex is needed on this wrapper. */}
          <span
            tabIndex={isEditableTitle ? undefined : 0}
            css={css`
              display: block;
              ${euiTextTruncate()};
            `}
          >
            {panelTitleElement}
          </span>
        </EuiToolTip>
      );
    }
    return (
      <EuiToolTip
        title={panelTitle}
        content={panelDescription}
        position="top"
        anchorProps={{
          'data-test-subj': 'embeddablePanelTooltipAnchor',
        }}
      >
        <div
          data-test-subj="embeddablePanelTitleInner"
          className="embPanel__titleInner"
          css={css`
            display: flex;
            flex-wrap: nowrap;
            column-gap: ${euiTheme.size.xs};
            align-items: center;
          `}
          tabIndex={0}
        >
          {!hideTitle ? (
            <h2
              // styles necessary for applying ellipsis and showing the info icon if description is present
              css={css`
                overflow: hidden;
                // The panel title is a heading, but rendered at the regular text size. Reset the
                // heading's font and margin so a global h2 style cannot override the panel title size
                font: inherit;
                margin: 0;
              `}
            >
              <EuiScreenReaderOnly>
                <span id={headerId}>
                  {panelTitle
                    ? i18n.translate('embeddableApi.ariaLabel', {
                        defaultMessage: 'Panel: {title}',
                        values: {
                          title: panelTitle,
                        },
                      })
                    : i18n.translate('embeddableApi.untitledPanelAriaLabel', {
                        defaultMessage: 'Untitled panel',
                      })}
                </span>
              </EuiScreenReaderOnly>
              {panelTitleElement}
            </h2>
          ) : null}
          <EuiIcon
            type="info"
            color="subdued"
            data-test-subj="embeddablePanelTitleDescriptionIcon"
            tabIndex={0}
            aria-label={i18n.translate('embeddableApi.header.descriptionIconAriaLabel', {
              defaultMessage: 'Description',
            })}
          />
        </div>
      </EuiToolTip>
    );
  }, [
    hideTitle,
    panelDescription,
    panelTitle,
    panelTitleElement,
    isEditableTitle,
    headerId,
    euiTheme.size.xs,
  ]);

  return describedPanelTitleElement;
};
