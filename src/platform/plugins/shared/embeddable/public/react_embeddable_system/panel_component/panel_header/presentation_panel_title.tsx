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
  EuiPopover,
  EuiScreenReaderOnly,
  EuiToolTip,
  euiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PublishesWritableTitle, ViewMode } from '@kbn/presentation-publishing';
import { apiPublishesWritableTitle } from '@kbn/presentation-publishing';
import type { CustomizePanelActionApi } from '../../../ui_actions/customize_panel_action';
import { isApiCompatibleWithCustomizePanelAction } from '../../../ui_actions/customize_panel_action';
import { openCustomizePanelFlyout } from '../../../ui_actions/customize_panel_action/open_customize_panel';

const SMART_TITLE_PREFIX = 'Count of records by ';

interface BreakdownFieldApi {
  getBreakdownFieldOptions: () => Promise<Array<{ value: string; label: string }>>;
  setBreakdownField: (fieldName: string) => Promise<void>;
}

function hasBreakdownFieldApi(api: unknown): api is BreakdownFieldApi {
  return (
    typeof (api as BreakdownFieldApi)?.getBreakdownFieldOptions === 'function' &&
    typeof (api as BreakdownFieldApi)?.setBreakdownField === 'function'
  );
}

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
  smartTitleActive,
  breakdownFieldName,
}: {
  api: unknown;
  headerId: string;
  hideTitle?: boolean;
  panelTitle?: string;
  panelDescription?: string;
  viewMode?: ViewMode;
  titleHighlight?: string | string[];
  smartTitleActive?: boolean;
  breakdownFieldName?: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const isEditableTitle = viewMode === 'edit' && isApiCompatibleWithCustomizePanelAction(api);

  const onClickCustomize = useCallback(() => {
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
        onClickCustomize();
      }
    },
    [onClickCustomize]
  );

  const [breakdownPopoverOpen, setBreakdownPopoverOpen] = useState(false);
  const [breakdownOptions, setBreakdownOptions] = useState<Array<{ value: string; label: string }>>(
    []
  );
  const [breakdownOptionsLoading, setBreakdownOptionsLoading] = useState(false);

  const openBreakdownPopover = useCallback(() => {
    setBreakdownPopoverOpen(true);
  }, []);
  const closeBreakdownPopover = useCallback(() => {
    setBreakdownPopoverOpen(false);
  }, []);

  const breakdownApi = hasBreakdownFieldApi(api) ? api : null;
  useEffect(() => {
    if (!breakdownPopoverOpen || !breakdownApi) return;
    setBreakdownOptionsLoading(true);
    breakdownApi
      .getBreakdownFieldOptions()
      .then(setBreakdownOptions)
      .catch(() => setBreakdownOptions([]))
      .finally(() => setBreakdownOptionsLoading(false));
  }, [breakdownPopoverOpen, breakdownApi]);

  const onSelectBreakdownField = useCallback(
    (fieldName: string) => {
      if (breakdownApi) {
        breakdownApi.setBreakdownField(fieldName).finally(closeBreakdownPopover);
      }
    },
    [breakdownApi, closeBreakdownPopover]
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
    const editableTitleStyles = css`
      text-decoration: none;

      &:hover,
      &:focus {
        text-decoration: none;
      }
    `;

    // Smart Title: prefix (plain) + only the field name as a primary blue link (popover or customize)
    if (smartTitleActive && breakdownFieldName) {
      const linkContent = (
        <EuiLink
          color="primary"
          onClick={hasBreakdownFieldApi(api) ? openBreakdownPopover : () => onClickCustomize()}
          data-test-subj="embeddablePanelTitle-SmartTitleFieldLink"
          aria-label={i18n.translate('embeddableApi.header.smartTitleFieldLinkAriaLabel', {
            defaultMessage: 'Data field: {field}. Click to change.',
            values: { field: breakdownFieldName },
          })}
        >
          {breakdownFieldName}
        </EuiLink>
      );

      const fieldNameLink = hasBreakdownFieldApi(api) ? (
        <EuiPopover
          button={linkContent}
          isOpen={breakdownPopoverOpen}
          closePopover={closeBreakdownPopover}
          anchorPosition="upCenter"
          panelPaddingSize="s"
          aria-label={i18n.translate('embeddableApi.header.smartTitleFieldPopoverAriaLabel', {
            defaultMessage: 'Breakdown fields',
          })}
          data-test-subj="embeddablePanelTitle-SmartTitleFieldPopover"
        >
          <div
            role="listbox"
            css={css`
              max-height: 300px;
              overflow: auto;
              min-width: 180px;
            `}
          >
            {breakdownOptionsLoading ? (
              <div css={css({ padding: 12 })}>
                {i18n.translate('embeddableApi.header.smartTitleLoadingFields', {
                  defaultMessage: 'Loading fields…',
                })}
              </div>
            ) : breakdownOptions.length === 0 ? (
              <div css={css({ padding: 12 })}>
                {i18n.translate('embeddableApi.header.smartTitleNoFields', {
                  defaultMessage: 'No breakdown fields available',
                })}
              </div>
            ) : (
              breakdownOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === breakdownFieldName}
                  css={css`
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    text-align: left;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-size: inherit;
                    &:hover {
                      background: ${euiTheme.colors.lightestShade};
                    }
                  `}
                  onClick={() => onSelectBreakdownField(opt.value)}
                  data-test-subj={`embeddablePanelTitle-SmartTitleFieldOption-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </EuiPopover>
      ) : (
        linkContent
      );

      return (
        <span data-test-subj="embeddablePanelTitle" css={titleStyles}>
          {SMART_TITLE_PREFIX}
          {fieldNameLink}
        </span>
      );
    }

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
        onClick={onClickCustomize}
        onKeyDown={onKeyDown}
        css={[titleStyles, editableTitleStyles]}
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
    onClickCustomize,
    onKeyDown,
    hideTitle,
    panelTitle,
    isEditableTitle,
    api,
    euiTheme,
    titleHighlight,
    smartTitleActive,
    breakdownFieldName,
    breakdownPopoverOpen,
    closeBreakdownPopover,
    breakdownOptions,
    breakdownOptionsLoading,
    openBreakdownPopover,
    onSelectBreakdownField,
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
