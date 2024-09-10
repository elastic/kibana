/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiResizableContainer } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { useExpandableFlyoutContext } from '../context';
import { changeInternalPercentagesAction } from '../store/internal_percentages_actions';
import { selectInternalPercentagesById, useDispatch, useSelector } from '../store/redux';
import {
  RESIZABLE_BUTTON_TEST_ID,
  RESIZABLE_LEFT_SECTION_TEST_ID,
  RESIZABLE_RIGHT_SECTION_TEST_ID,
} from './test_ids';
import { LeftSection } from './left_section';
import { FlyoutPanelProps } from '../..';
import { RightSection } from './right_section';

const RIGHT_SECTION_MIN_WIDTH = '380px';
const LEFT_SECTION_MIN_WIDTH = '380px';
const LEFT_PANEL_ID = 'left';
const RIGHT_PANEL_ID = 'right';

interface ResizableContainerProps {
  /**
   *
   */
  showPreview: boolean;
  /**
   *
   */
  leftSection: any;
  /**
   *
   */
  rightSection: any;
  /**
   *
   */
  left: any;
  /**
   *
   */
  right: any;
}

/**
 * Component that renders the left and right section when the flyout is in expanded mode.
 * It allows the resizing of the sections, saving the percentages in local storage.
 */
export const ResizableContainer: React.FC<ResizableContainerProps> = memo(
  ({ leftSection, rightSection, left, right, showPreview }: ResizableContainerProps) => {
    console.log('render ResizableContainer');

    const { urlKey } = useExpandableFlyoutContext();
    const dispatch = useDispatch();
    const { internalLeftPercentage, internalRightPercentage } = useSelector(
      selectInternalPercentagesById(urlKey)
    );

    const leftComponent = useMemo(
      () => (leftSection ? leftSection.component({ ...(left as FlyoutPanelProps) }) : null),
      [leftSection, left]
    );
    const rightComponent = useMemo(
      () => (rightSection ? rightSection.component({ ...(right as FlyoutPanelProps) }) : null),
      [rightSection, right]
    );

    return (
      <EuiResizableContainer
        css={css`
          height: 100%;
        `}
        onPanelWidthChange={(newSizes) => {
          if (urlKey) {
            dispatch(
              changeInternalPercentagesAction({
                ...(newSizes as { left: number; right: number }),
                id: urlKey,
                savedToLocalStorage: true,
              })
            );
          }
        }}
      >
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              id={LEFT_PANEL_ID}
              initialSize={50}
              size={internalLeftPercentage}
              minSize={LEFT_SECTION_MIN_WIDTH}
              paddingSize="none"
              data-test-subj={RESIZABLE_LEFT_SECTION_TEST_ID}
            >
              <LeftSection component={leftComponent} />
            </EuiResizablePanel>
            <EuiResizableButton disabled={showPreview} data-test-subj={RESIZABLE_BUTTON_TEST_ID} />
            <EuiResizablePanel
              id={RIGHT_PANEL_ID}
              initialSize={50}
              size={internalRightPercentage}
              minSize={RIGHT_SECTION_MIN_WIDTH}
              paddingSize="none"
              data-test-subj={RESIZABLE_RIGHT_SECTION_TEST_ID}
            >
              <RightSection component={rightComponent} />
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    );
  }
);

ResizableContainer.displayName = 'ResizableContainer';
