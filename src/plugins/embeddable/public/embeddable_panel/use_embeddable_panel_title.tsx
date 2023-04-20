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

import { CustomizePanelAction, IEmbeddable, ViewMode } from '../lib';
import { useSelectFromEmbeddableInput } from './use_select_from_embeddable';
import { getEditTitleAriaLabel, placeholderTitle } from './embeddable_panel_strings';

export const useEmbeddablePanelTitle = (
  embeddable: IEmbeddable,
  customizePanelAction?: CustomizePanelAction
) => {
  const title = useSelectFromEmbeddableInput('title', embeddable);
  const viewMode = useSelectFromEmbeddableInput('viewMode', embeddable);
  const description = useSelectFromEmbeddableInput('description', embeddable);

  const titleComponent = useMemo(() => {
    const titleClassNames = classNames('embPanel__titleText', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      embPanel__placeholderTitleText: !title,
    });

    if (viewMode === ViewMode.VIEW) {
      return <span className={titleClassNames}>{title || placeholderTitle}</span>;
    }
    if (customizePanelAction) {
      <EuiLink
        color="text"
        className={titleClassNames}
        aria-label={getEditTitleAriaLabel(title)}
        data-test-subj={'embeddablePanelTitleLink'}
        onClick={() => customizePanelAction.execute({ embeddable })}
      >
        {title || placeholderTitle}
      </EuiLink>;
    }
    return null;
  }, [customizePanelAction, embeddable, title, viewMode]);

  const titleComponentWithDescription = useMemo(() => {
    if (!description) return titleComponent;
    return (
      <EuiToolTip
        content={description}
        delay="regular"
        position="top"
        anchorClassName="embPanel__titleTooltipAnchor"
      >
        <span className="embPanel__titleInner">
          {titleComponent} <EuiIcon type="iInCircle" color="subdued" />
        </span>
      </EuiToolTip>
    );
  }, [description, titleComponent]);

  return titleComponentWithDescription;
};
