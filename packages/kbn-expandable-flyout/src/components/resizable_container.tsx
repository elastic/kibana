/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiResizableContainer } from '@elastic/eui';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import { useExpandableFlyoutContext } from '../context';
import { changeInternalPercentagesAction } from '../actions';
import { selectWidthsById, useDispatch, useSelector } from '../redux';
import {
  RESIZABLE_BUTTON_TEST_ID,
  RESIZABLE_LEFT_SECTION_TEST_ID,
  RESIZABLE_RIGHT_SECTION_TEST_ID,
} from './test_ids';
import type { Panel } from '../types';
import { LeftSection } from './left_section';
import { FlyoutPanelProps, useExpandableFlyoutState } from '../..';
import { RightSection } from './right_section';
import { useSections } from '../hooks/use_sections';

const RIGHT_SECTION_MIN_WIDTH = '380px';
const LEFT_SECTION_MIN_WIDTH = '380px';
const LEFT_PANEL_ID = 'left';
const RIGHT_PANEL_ID = 'right';

interface ResizableContainerProps {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
  /**
   *
   */
  showPreview: boolean;
}

/**
 * Component that renders the left and right section when the flyout is in expanded mode.
 * It allows the resizing of the sections, saving the percentages in local storage.
 */
export const ResizableContainer: React.FC<ResizableContainerProps> = memo(
  ({ registeredPanels, showPreview }: ResizableContainerProps) => {
    const { urlKey } = useExpandableFlyoutContext();
    const dispatch = useDispatch();
    const { left, right } = useExpandableFlyoutState();
    const { internalLeftPercentage, internalRightPercentage } = useSelector(
      selectWidthsById(urlKey)
    );

    // retrieves the sections to be displayed
    const { leftSection, rightSection } = useSections({
      registeredPanels,
    });

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
              <LeftSection
                component={(leftSection as Panel).component({ ...(left as FlyoutPanelProps) })}
              />
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
              <RightSection
                component={(rightSection as Panel).component({ ...(right as FlyoutPanelProps) })}
              />
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    );
  }
);

ResizableContainer.displayName = 'ResizableContainer';
