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
import {
  RESIZABLE_BUTTON_TEST_ID,
  RESIZABLE_LEFT_SECTION_TEST_ID,
  RESIZABLE_RIGHT_SECTION_TEST_ID,
} from './test_ids';
import { useInternalPercentages } from '../hooks/use_internal_percentages';
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
   * Width of the right section in pixels
   */
  defaultRightSectionWidth: number;
  /**
   * Width of the left section in pixels
   */
  defaultLeftSectionWidth: number;
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
  ({
    registeredPanels,
    defaultRightSectionWidth,
    defaultLeftSectionWidth,
    showPreview,
  }: ResizableContainerProps) => {
    const { left, right } = useExpandableFlyoutState();

    // retrieves the sections to be displayed
    const { leftSection, rightSection } = useSections({
      registeredPanels,
    });

    // allows to get, set, and reset the internal left and right percentages set by user when flyout is in expanded mode
    const {
      percentages: internalResizedPercentages,
      setPercentages: setInternalResizedPercentages,
    } = useInternalPercentages({ defaultRightSectionWidth, defaultLeftSectionWidth });

    return (
      <EuiResizableContainer
        css={css`
          height: 100%;
        `}
        onPanelWidthChange={(newSizes) =>
          setInternalResizedPercentages(newSizes as { left: number; right: number })
        }
      >
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              id={LEFT_PANEL_ID}
              size={internalResizedPercentages.left}
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
              size={internalResizedPercentages.right}
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
