/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiIcon,
  EuiLink,
  EuiScreenReaderOnly,
  EuiToolTip,
  euiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/presentation-publishing';
import {
  CustomizePanelActionApi,
  isApiCompatibleWithCustomizePanelAction,
} from '../../panel_actions/customize_panel_action';
import { openCustomizePanelFlyout } from '../../panel_actions/customize_panel_action/open_customize_panel';

export const PresentationPanelTitle = ({
  api,
  headerId,
  viewMode,
  hideTitle,
  panelTitle,
  panelDescription,
}: {
  api: unknown;
  headerId: string;
  hideTitle?: boolean;
  panelTitle?: string;
  panelDescription?: string;
  viewMode?: ViewMode;
}) => {
  const { euiTheme } = useEuiTheme();

  const onClick = useCallback(() => {
    openCustomizePanelFlyout({
      api: api as CustomizePanelActionApi,
      focusOnTitle: true,
    });
  }, [api]);

  const panelTitleElement = useMemo(() => {
    if (hideTitle) return null;

    const titleStyles = css`
      ${euiTextTruncate()};
      font-weight: ${euiTheme.font.weight.bold};

      .kbnGridPanel--active & {
        pointer-events: none; // prevent drag event from triggering onClick
      }
    `;

    if (viewMode !== 'edit' || !isApiCompatibleWithCustomizePanelAction(api)) {
      return (
        <span data-test-subj="embeddablePanelTitle" css={titleStyles}>
          {panelTitle}
        </span>
      );
    }

    return (
      <EuiLink
        color="text"
        onClick={onClick}
        css={titleStyles}
        aria-label={i18n.translate('presentationPanel.header.titleAriaLabel', {
          defaultMessage: 'Click to edit title: {title}',
          values: { title: panelTitle },
        })}
        data-test-subj="embeddablePanelTitle"
      >
        {panelTitle}
      </EuiLink>
    );
  }, [onClick, hideTitle, panelTitle, viewMode, api, euiTheme]);

  const describedPanelTitleElement = useMemo(() => {
    if (hideTitle) return null;

    if (!panelDescription) {
      return panelTitleElement;
    }

    return (
      <EuiToolTip
        title={panelTitle}
        content={panelDescription}
        delay="regular"
        position="top"
        anchorProps={{
          'data-test-subj': 'embeddablePanelTooltipAnchor',
          css: css`
            max-width: 100%;
            display: flex;
            flex-wrap: nowrap;
            column-gap: ${euiTheme.size.xs};
            align-items: center;
          `,
        }}
      >
        <div data-test-subj="embeddablePanelTitleInner" className="embPanel__titleInner">
          {!hideTitle ? (
            <h2>
              <EuiScreenReaderOnly>
                <span id={headerId}>
                  {panelTitle
                    ? i18n.translate('presentationPanel.ariaLabel', {
                        defaultMessage: 'Panel: {title}',
                        values: {
                          title: panelTitle,
                        },
                      })
                    : i18n.translate('presentationPanel.untitledPanelAriaLabel', {
                        defaultMessage: 'Untitled panel',
                      })}
                </span>
              </EuiScreenReaderOnly>
              {panelTitleElement}&nbsp;
            </h2>
          ) : null}
          <EuiIcon
            type="iInCircle"
            color="subdued"
            data-test-subj="embeddablePanelTitleDescriptionIcon"
            tabIndex={0}
          />
        </div>
      </EuiToolTip>
    );
  }, [hideTitle, panelDescription, panelTitle, panelTitleElement, headerId, euiTheme.size.xs]);

  return describedPanelTitleElement;
};
