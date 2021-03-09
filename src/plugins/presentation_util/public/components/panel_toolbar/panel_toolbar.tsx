/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './panel_toolbar.scss';
import React, { FC } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroupOptionProps,
} from '@elastic/eui';
import { htmlIdGenerator } from '@elastic/eui';
import { ComponentStrings } from '../../i18n/components';

const { PanelToolbar: strings } = ComponentStrings;
interface Props {
  /** The label for the primary action button */
  primaryActionButton: JSX.Element;
  /** Array of buttons for quick actions */
  quickButtons?: QuickButton[];
  /** Handler for the Add from Library button */
  onLibraryClick: () => void;
}

type QuickButton = Partial<EuiButtonGroupOptionProps> & {
  onClick: () => void;
};

export const PanelToolbar: FC<Props> = ({
  primaryActionButton,
  quickButtons = [],
  onLibraryClick,
}) => {
  const buttonGroupOptions = quickButtons.map((button: QuickButton, index) => ({
    ...button,
    id: `${htmlIdGenerator()()}${index}`,
    'aria-label': button['aria-label'] ? button['aria-label'] : `Create new ${button.label}`,
  }));

  const onChangeIconsMulti = (optionId: string) => {
    buttonGroupOptions.find((x) => x.id === optionId)?.onClick();
  };

  return (
    <EuiFlexGroup className="panelToolbar" id="kbnPresentationToolbar__panelToolbar" gutterSize="s">
      <EuiFlexItem grow={false}>{primaryActionButton}</EuiFlexItem>
      {quickButtons.length ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiButtonGroup
              className="panelToolbar__quickButtonGroup"
              legend="Quick buttons"
              options={buttonGroupOptions as EuiButtonGroupOptionProps[]}
              onChange={onChangeIconsMulti}
              type="multi"
              isIconOnly
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          className="panelToolbarButton"
          iconType="folderOpen"
          onClick={onLibraryClick}
        >
          {strings.getLibraryButtonLabel()}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
