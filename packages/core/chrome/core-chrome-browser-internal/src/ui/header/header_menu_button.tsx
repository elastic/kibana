/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, Ref } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { EuiHeaderSectionItemButtonRef } from '@elastic/eui/src/components/header/header_section/header_section_item_button';

interface HeaderMenuButtonProps {
  'aria-controls': string;
  'aria-label': string;
  'aria-expanded': boolean;
  'aria-pressed': boolean;
  'data-test-subj': string;
  onClick: () => void;
  forwardRef: Ref<EuiHeaderSectionItemButtonRef> | undefined;
}

export const HeaderMenuButton = forwardRef(
  (props: HeaderMenuButtonProps, ref: Ref<EuiHeaderSectionItemButtonRef> | undefined) => {
    return (
      <EuiHeaderSectionItemButton
        data-test-subj={props['data-test-subj']}
        aria-label={props['aria-label']}
        onClick={props.onClick}
        aria-expanded={props['aria-expanded']}
        aria-pressed={props['aria-pressed']}
        aria-controls={props['aria-controls']}
        ref={props.forwardRef}
      >
        <EuiIcon type="menu" size="m" />
      </EuiHeaderSectionItemButton>
    );
  }
);
