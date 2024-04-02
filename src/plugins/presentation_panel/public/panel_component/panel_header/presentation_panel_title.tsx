/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import classNames from 'classnames';
import React, { useMemo } from 'react';

import { ViewMode } from '@kbn/presentation-publishing';
import { getEditTitleAriaLabel, placeholderTitle } from '../presentation_panel_strings';
import {
  CustomizePanelActionApi,
  isApiCompatibleWithCustomizePanelAction,
} from '../../panel_actions/customize_panel_action';
import { openCustomizePanelFlyout } from '../../panel_actions/customize_panel_action/open_customize_panel';

export const PresentationPanelTitle = ({
  api,
  viewMode,
  hideTitle,
  panelTitle,
  panelDescription,
}: {
  api: unknown;
  hideTitle?: boolean;
  panelTitle?: string;
  panelDescription?: string;
  viewMode?: ViewMode;
}) => {
  const panelTitleElement = useMemo(() => {
    if (hideTitle) return null;
    const titleClassNames = classNames('embPanel__titleText', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      embPanel__placeholderTitleText: !panelTitle,
    });

    if (viewMode !== 'edit' || !isApiCompatibleWithCustomizePanelAction(api)) {
      return <span className={titleClassNames}>{panelTitle}</span>;
    }

    return (
      <EuiLink
        color="text"
        className={titleClassNames}
        aria-label={getEditTitleAriaLabel(panelTitle)}
        data-test-subj={'embeddablePanelTitleLink'}
        onClick={() =>
          openCustomizePanelFlyout({
            api: api as CustomizePanelActionApi,
            focusOnTitle: true,
          })
        }
      >
        {panelTitle || placeholderTitle}
      </EuiLink>
    );
  }, [hideTitle, panelTitle, viewMode, api]);

  const describedPanelTitleElement = useMemo(() => {
    if (!panelDescription) {
      if (hideTitle) return null;
      return (
        <span data-test-subj="embeddablePanelTitleInner" className="embPanel__titleInner">
          {panelTitleElement}
        </span>
      );
    }
    return (
      <EuiToolTip
        title={!hideTitle ? panelTitle || undefined : undefined}
        content={panelDescription}
        delay="regular"
        position="top"
        anchorClassName="embPanel__titleTooltipAnchor"
        anchorProps={{ 'data-test-subj': 'embeddablePanelTooltipAnchor' }}
      >
        <span data-test-subj="embeddablePanelTitleInner" className="embPanel__titleInner">
          {!hideTitle ? <>{panelTitleElement}&nbsp;</> : null}
          <EuiIcon
            type="iInCircle"
            color="subdued"
            data-test-subj="embeddablePanelTitleDescriptionIcon"
          />
        </span>
      </EuiToolTip>
    );
  }, [hideTitle, panelDescription, panelTitle, panelTitleElement]);

  return describedPanelTitleElement;
};
