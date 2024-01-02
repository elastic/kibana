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
import { CustomizePanelAction } from '../panel_actions';
import { getEditTitleAriaLabel, placeholderTitle } from '../embeddable_panel_strings';
import { EmbeddablePanelPopover } from './embeddable_panel_popover';

const AI_SUPPORTED_INTEGRATIONS = ['[Metrics Oracle]', '[Metrics Kubernetes]'];

const supportsAIPopover = (title?: string) => {
  if (!title) return false;
  return AI_SUPPORTED_INTEGRATIONS.some((integration) => title.includes(integration));
};

export const EmbeddablePanelTitle = ({
  viewMode,
  hideTitle,
  embeddable,
  description,
  customizePanelAction,
}: {
  hideTitle?: boolean;
  viewMode?: ViewMode;
  description?: string;
  embeddable: IEmbeddable;
  customizePanelAction?: CustomizePanelAction;
}) => {
  const title = embeddable.getTitle();
  const aiExplanationSupported = supportsAIPopover(title);

  const titleComponent = useMemo(() => {
    if (hideTitle) return null;
    const titleClassNames = classNames('embPanel__titleText', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      embPanel__placeholderTitleText: !title,
    });

    if (viewMode === ViewMode.VIEW) {
      return <span className={titleClassNames}>{title}</span>;
    }
    if (customizePanelAction) {
      return (
        <EuiLink
          color="text"
          className={titleClassNames}
          aria-label={getEditTitleAriaLabel(title)}
          data-test-subj={'embeddablePanelTitleLink'}
          onClick={() => customizePanelAction.execute({ embeddable })}
        >
          {title || placeholderTitle}
        </EuiLink>
      );
    }
    return null;
  }, [customizePanelAction, embeddable, title, viewMode, hideTitle]);

  const titleComponentWithDescription = useMemo(() => {
    if (!description)
      return (
        <>
          <span className="embPanel__titleInner">{titleComponent}</span>
          {aiExplanationSupported ? <EmbeddablePanelPopover title={title} /> : null}
        </>
      );
    return (
      <EuiToolTip
        content={description}
        delay="regular"
        position="top"
        anchorClassName="embPanel__titleTooltipAnchor"
      >
        <span className="embPanel__titleInner">
          {titleComponent}{' '}
          <EuiIcon
            type="iInCircle"
            color="subdued"
            data-test-subj="embeddablePanelTitleDescriptionIcon"
          />
        </span>
      </EuiToolTip>
    );
  }, [aiExplanationSupported, description, title, titleComponent]);

  return titleComponentWithDescription;
};
