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
import { customizePanelAction } from '../../panel_actions/panel_actions';
import { getEditTitleAriaLabel, placeholderTitle } from '../presentation_panel_strings';

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
    const titleClassNames = classNames('presentationPanel__titleText', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      presentationPanel__placeholderTitleText: !panelTitle,
    });

    if (viewMode !== 'edit') {
      return <span className={titleClassNames}>{panelTitle}</span>;
    }
    if (customizePanelAction) {
      return (
        <EuiLink
          color="text"
          className={titleClassNames}
          aria-label={getEditTitleAriaLabel(panelTitle)}
          data-test-subj={'presentationPanelTitleLink'}
          onClick={() => customizePanelAction.execute({ embeddable: api })}
        >
          {panelTitle || placeholderTitle}
        </EuiLink>
      );
    }
    return null;
  }, [hideTitle, panelTitle, viewMode, api]);

  const describedPanelTitleElement = useMemo(() => {
    if (!panelDescription)
      return (
        <span data-test-subj="presentationPanelTitle" className="presentationPanel__titleInner">
          {panelTitleElement}
        </span>
      );
    return (
      <EuiToolTip
        content={panelDescription}
        delay="regular"
        position="top"
        anchorClassName="presentationPanel__titleTooltipAnchor"
      >
        <span data-test-subj="presentationPanelTitle" className="presentationPanel__titleInner">
          {panelTitleElement}{' '}
          <EuiIcon
            type="iInCircle"
            color="subdued"
            data-test-subj="embeddablePanelTitleDescriptionIcon"
          />
        </span>
      </EuiToolTip>
    );
  }, [panelDescription, panelTitleElement]);

  return describedPanelTitleElement;
};
