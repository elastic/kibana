/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiPopover, useGeneratedHtmlId, EuiPopoverTitle, EuiKeyPadMenu } from '@elastic/eui';

import { ProjectType } from '@kbn/serverless-types';

import { SwitcherItem } from './item';
import type { ProjectSwitcherComponentProps } from './types';
import { HeaderButton } from './header_button';
import { projectTypes } from './constants';

export { TEST_ID as TEST_ID_BUTTON } from './header_button';
export const TEST_ID_ITEM_GROUP = 'projectSwitcherItemGroup';

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

  const onChange = (projectType: ProjectType) => {
    closePopover();
    onProjectChange(projectType);
    return false;
  };

  const items = projectTypes.map((type) => (
    <SwitcherItem
      key={type}
      type={type}
      onChange={onChange}
      isSelected={currentProjectType === type}
    />
  ));

  const button = <HeaderButton onClick={onButtonClick} {...{ currentProjectType }} />;

  return (
    <EuiPopover
      {...{ id, button, isOpen, closePopover }}
      anchorPosition="downRight"
      repositionOnScroll
    >
      <EuiPopoverTitle>Switch Project Type</EuiPopoverTitle>
      <EuiKeyPadMenu css={switcherCSS} data-test-subj={TEST_ID_ITEM_GROUP}>
        {items}
      </EuiKeyPadMenu>
    </EuiPopover>
  );
};
