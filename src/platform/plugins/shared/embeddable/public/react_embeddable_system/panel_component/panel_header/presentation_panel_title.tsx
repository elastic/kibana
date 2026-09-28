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
import type { ViewMode } from '@kbn/presentation-publishing';
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

    // Smart Title: prefix (plain) + only the field name as a primary blue link (popover or customize)
    if (smartTitleActive && breakdownFieldName) {
      const linkContent = (
        <EuiLink
          color="primary"
          onClick={
            hasBreakdownFieldApi(api)
              ? openBreakdownPopover
              : () => onClickCustomize()
          }
          data-test-subj="embeddablePanelTitle-SmartTitleFieldLink"
          aria-label={i18n.translate(
            'presentationPanel.header.smartTitleFieldLinkAriaLabel',
            {
              defaultMessage: 'Data field: {field}. Click to change.',
              values: { field: breakdownFieldName },
            }
          )}
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
                {i18n.translate('presentationPanel.header.smartTitleLoadingFields', {
                  defaultMessage: 'Loading fields…',
                })}
              </div>
            ) : breakdownOptions.length === 0 ? (
              <div css={css({ padding: 12 })}>
                {i18n.translate('presentationPanel.header.smartTitleNoFields', {
                  defaultMessage: 'No breakdown fields available',
                })}
              </div>
            ) : (
              breakdownOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
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
    onClickCustomize,
    onKeyDown,
    hideTitle,
    panelTitle,
    isEditableTitle,
    viewMode,
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
