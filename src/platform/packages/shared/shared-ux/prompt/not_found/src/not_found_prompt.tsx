/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiEmptyPromptProps,
  EuiImage,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const NOT_FOUND_TITLE = i18n.translate('sharedUXPackages.prompt.errors.notFound.title', {
  defaultMessage: 'Page not found',
});

const NOT_FOUND_BODY = i18n.translate('sharedUXPackages.prompt.errors.notFound.body', {
  defaultMessage:
    "Sorry, the page you're looking for can't be found. It might have been removed or renamed, or maybe it never existed at all.",
});

const NOT_FOUND_GO_BACK = i18n.translate('sharedUXPackages.prompt.errors.notFound.goBacklabel', {
  defaultMessage: 'Go back',
});

interface NotFoundProps {
  /** Array of buttons, links and other actions to show at the bottom of the `EuiEmptyPrompt`. Defaults to a "Back" button. */
  actions?: EuiEmptyPromptProps['actions'];
  title?: EuiEmptyPromptProps['title'] | string;
  body?: EuiEmptyPromptProps['body'];
}

/**
 * Predefined `EuiEmptyPrompt` for 404 pages.
 */
export const NotFoundPrompt = ({ actions, title, body }: NotFoundProps) => {
  const { colorMode } = useEuiTheme();
  const [imageSrc, setImageSrc] = useState<string>();
  const goBack = useCallback(() => history.back(), []);

  const DEFAULT_ACTIONS = useMemo(
    () => [
      <EuiButtonEmpty iconType="arrowLeft" flush="both" onClick={goBack}>
        {NOT_FOUND_GO_BACK}
      </EuiButtonEmpty>,
    ],
    [goBack]
  );

  useEffect(() => {
    const loadImage = async () => {
      if (colorMode === 'DARK') {
        const { default: imgSrc } = await import(`./assets/404_astronaut_dark.png`);
        setImageSrc(imgSrc);
      } else {
        const { default: imgSrc } = await import(`./assets/404_astronaut_light.png`);
        setImageSrc(imgSrc);
      }
    };
    loadImage();
  }, [colorMode]);

  const icon = imageSrc ? <EuiImage src={imageSrc} alt="" /> : null;

  return (
    <EuiEmptyPrompt
      color="subdued"
      titleSize="m"
      icon={icon}
      title={typeof title === 'string' || !title ? <h2>{title ?? NOT_FOUND_TITLE}</h2> : title}
      body={body ?? NOT_FOUND_BODY}
      actions={actions ?? DEFAULT_ACTIONS}
    />
  );
};
