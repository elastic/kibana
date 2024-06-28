/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { type Props as AirdropDragButtonProps } from './airdrop_drag_button';
import { DragWrapper } from './drag_wrapper';

type Props = AirdropDragButtonProps;

export const AirdropPopover: FC<Props> = ({ iconSize, size, ...rest }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          display="base"
          iconSize={iconSize}
          size={size}
          iconType="watchesApp"
          aria-label="Next"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downCenter"
    >
      <EuiPopoverTitle>Airdrop</EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText size="s">
          <p>
            Selfies migas stumptown hot chicken quinoa wolf green juice, mumblecore tattooed trust
            fund hammock truffaut taxidermy kogi.
          </p>
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <DragWrapper {...rest}>
          <EuiButton fullWidth size="s">
            Drag on other Kibana window
          </EuiButton>
        </DragWrapper>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
