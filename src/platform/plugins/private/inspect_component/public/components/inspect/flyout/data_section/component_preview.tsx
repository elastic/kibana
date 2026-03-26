/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
// @ts-expect-error - this module has no exported types
import domtoimage from 'dom-to-image-more';
import { EuiImage, EuiSkeletonRectangle, EuiCard, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

const PREVIEW_ALT_TEXT = i18n.translate(
  'kbnInspectComponent.inspectFlyout.dataSection.previewImageAltText',
  {
    defaultMessage: 'Preview of the component associated with the selected element',
  }
);

const PREVIEW_BADGE_LABEL = i18n.translate(
  'kbnInspectComponent.inspectFlyout.dataSection.previewCardLabel',
  {
    defaultMessage: 'Component Preview',
  }
);

interface Props {
  element: HTMLElement | null;
}

/**
 * ComponentPreview component displays a preview of the source component associated with the inspected HTML element.
 */
export const ComponentPreview = ({ element }: Props) => {
  const [screenshot, setScreenshot] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const CARD_WIDTH = 280;
  const CARD_HEIGHT = 224;
  /**
   * IMAGE_SIZE is used to set the size of the EuiImage component.
   * Without it, the image would overflow the card in which it is contained.
   */
  const IMAGE_SIZE = 200;

  const cardCss = css`
    width: ${CARD_WIDTH}px;
    height: ${CARD_HEIGHT}px;
    margin: 0 auto;
  `;

  const badgeCss = css`
    user-select: none;
  `;

  useEffect(() => {
    const generateScreenshot = async () => {
      try {
        const canvas = await domtoimage.toCanvas(element);
        setScreenshot(canvas.toDataURL('image/png'));
      } catch (err) {
        return;
      } finally {
        setIsLoading(false);
      }
    };

    if (element) {
      generateScreenshot();
    }
  }, [element]);

  if (!element) {
    return null;
  }

  return (
    <>
      <EuiSkeletonRectangle
        isLoading={isLoading}
        contentAriaLabel={PREVIEW_ALT_TEXT}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        borderRadius="none"
        data-test-subj="inspectFlyoutPreviewImage"
      >
        <EuiCard
          title=""
          betaBadgeProps={{
            label: PREVIEW_BADGE_LABEL,
            css: badgeCss,
          }}
          css={cardCss}
          paddingSize="xs"
        >
          <EuiImage alt={PREVIEW_ALT_TEXT} src={screenshot} size={IMAGE_SIZE} hasShadow={false} />
        </EuiCard>
      </EuiSkeletonRectangle>
      <EuiSpacer size="l" />
    </>
  );
};
