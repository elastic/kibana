/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useMemo } from 'react';
import { EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';

import { IEmbeddable, ViewMode } from '../../lib';
import { getEditTitleAriaLabel, placeholderTitle } from '../embeddable_panel_strings';
import { EditPanelAction } from '../panel_actions';
import { openCustomizePanelFlyout } from '../panel_actions/customize_panel_action/open_customize_panel';

export const EmbeddablePanelTitle = ({
  viewMode,
  hideTitle,
  embeddable,
  description,
  editPanelAction,
}: {
  hideTitle?: boolean;
  viewMode?: ViewMode;
  description?: string;
  embeddable: IEmbeddable;
  editPanelAction?: EditPanelAction;
}) => {
  const title = embeddable.getTitle();

  const titleComponent = useMemo(() => {
    if (hideTitle) return null;
    const titleClassNames = classNames('embPanel__titleText', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      embPanel__placeholderTitleText: !title,
    });

    if (viewMode === ViewMode.VIEW) {
      return <span className={titleClassNames}>{title}</span>;
    }
    if (editPanelAction) {
      return (
        <EuiLink
          color="text"
          className={titleClassNames}
          aria-label={getEditTitleAriaLabel(title)}
          data-test-subj={'embeddablePanelTitleLink'}
          onClick={() =>
            openCustomizePanelFlyout({
              editPanel: editPanelAction,
              embeddable,
              focusOnTitle: true,
            })
          }
        >
          {title || placeholderTitle}
        </EuiLink>
      );
    }
    return null;
  }, [editPanelAction, embeddable, title, viewMode, hideTitle]);

  const titleComponentWithDescription = useMemo(() => {
    if (!description)
      return (
        <span className="embPanel__titleInner" data-test-subj="embeddablePanelTitleInner">
          {titleComponent}
        </span>
      );
    return (
      <EuiToolTip
        content={description}
        delay="regular"
        position="top"
        anchorClassName="embPanel__titleTooltipAnchor"
        anchorProps={{ 'data-test-subj': 'embeddablePanelTooltipAnchor' }}
      >
        <span className="embPanel__titleInner" data-test-subj="embeddablePanelTitleInner">
          {titleComponent}{' '}
          <EuiIcon
            type="iInCircle"
            color="subdued"
            data-test-subj="embeddablePanelTitleDescriptionIcon"
          />
        </span>
      </EuiToolTip>
    );
  }, [description, titleComponent]);

  return titleComponentWithDescription;
};
