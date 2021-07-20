/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';

import classNames from 'classnames';
import React, { useMemo, useState } from 'react';
import useMount from 'react-use/lib/useMount';
import { InputControlEmbeddable } from '../embeddable/types';

import './control_frame.scss';

interface ControlFrameProps {
  embeddable: InputControlEmbeddable;
  twoLine?: boolean;
}

export const ControlFrame = ({ twoLine, embeddable }: ControlFrameProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  useMount(() => {
    if (embeddableRoot.current && embeddable) embeddable.render(embeddableRoot.current);
  });

  const button = (
    <EuiButtonEmpty
      color="text"
      className="optionsList--buttonOverride"
      textProps={{
        className: classNames('optionsList', {
          'optionsList--twoLine': twoLine,
        }),
      }}
      onClick={() => setIsPopoverOpen((open) => !open)}
      contentProps={{ className: 'optionsList--buttonContentOverride' }}
    >
      <span className="optionsList--title">{embeddable.getInput().title}</span>
      <span className="optionsList--control" ref={embeddableRoot} />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      id="popoverExampleMultiSelect"
      button={button}
      isOpen={isPopoverOpen}
      anchorClassName="optionsList--anchorOverride"
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="upLeft"
      ownFocus
      repositionOnScroll
    >
      {embeddable.getPopover()}
    </EuiPopover>
  );
};
