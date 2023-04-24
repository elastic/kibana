/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiPopover,
  useGeneratedHtmlId,
  EuiPopoverTitle,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiFlexGroup,
} from '@elastic/eui';

import { ProjectType } from '@kbn/serverless-types';

import { SwitcherItem } from './item';
import type { ProjectSwitcherComponentProps } from './types';

export const TEST_ID_BUTTON = 'projectSwitcherButton';
export const TEST_ID_ITEM_GROUP = 'projectSwitcherItemGroup';

const types: ProjectType[] = ['security', 'observability', 'search'];

const switcherCSS = css`
  min-width: 240px;
`;

export const ProjectSwitcher = ({
  currentProjectType,
  onProjectChange,
}: ProjectSwitcherComponentProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const id = useGeneratedHtmlId({
    prefix: 'switcherPopover',
  });

  const closePopover = () => {
    setIsOpen(false);
  };

  const onButtonClick = () => {
    setIsOpen(!isOpen);
  };

  const onChange = (projectType: ProjectType, e: React.MouseEvent) => {
    e.preventDefault();
    closePopover();
    onProjectChange(projectType);
    return false;
  };

  const items = types.map((type) => (
    <EuiFlexItem key={type}>
      <span>
        <SwitcherItem type={type} onClick={onChange} isCurrent={currentProjectType === type} />
      </span>
    </EuiFlexItem>
  ));

  const button = (
    <EuiHeaderSectionItemButton
      aria-label="Developer Tools"
      onClick={onButtonClick}
      data-test-subj={TEST_ID_BUTTON}
    >
      <EuiIcon type="submodule" size="m" />
    </EuiHeaderSectionItemButton>
  );

  return (
    <EuiPopover
      {...{ id, button, isOpen, closePopover }}
      anchorPosition="downRight"
      repositionOnScroll
    >
      <EuiPopoverTitle>Switch Project Type</EuiPopoverTitle>
      <EuiFlexGroup
        css={switcherCSS}
        direction="column"
        gutterSize="s"
        data-test-subj={TEST_ID_ITEM_GROUP}
      >
        {items}
      </EuiFlexGroup>
    </EuiPopover>
  );
};
