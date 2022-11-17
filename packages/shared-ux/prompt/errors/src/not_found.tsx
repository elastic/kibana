/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, useCallback } from 'react';
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

const NOT_FOUND_BODY = i18n.translate('sharedUxPackages.prompt.errors.notFound.body', {
  defaultMessage:
    "Sorry, we can't find the page you're looking for. It might have been removed or renamed, or maybe it never existed.",
});

const NOT_FOUND_GO_BACK = i18n.translate('sharedUxPackages.prompt.errors.notFound.goBacklabel', {
  defaultMessage: 'Go back',
});

interface NotFoundProps {
  actions?: EuiEmptyPromptProps['actions'];
}

export function NotFound({ actions }: NotFoundProps) {
  const { colorMode } = useEuiTheme();
  const [errorImage, setErrorImage] = useState();
  const goBack = useCallback(() => history.back(), []);

  useEffect(() => {
    const loadImage = async () => {
      if (colorMode === 'LIGHT') {
        const { default: img } = await import('./assets/404_astronaut_light.png');
        setErrorImage(img);
      } else {
        const { default: img } = await import('./assets/404_astronaut_dark.png');
        setErrorImage(img);
      }
    };
    loadImage();
  }, [colorMode]);

  const icon = errorImage ? <EuiImage src={errorImage} alt="" /> : null;

  return (
    <EuiEmptyPrompt
      color="subdued"
      titleSize="m"
      icon={icon}
      title={<h2>{NOT_FOUND_TITLE}</h2>}
      body={NOT_FOUND_BODY}
      actions={
        actions ?? [
          <EuiButtonEmpty iconType="arrowLeft" flush="both" onClick={goBack}>
            {NOT_FOUND_GO_BACK}
          </EuiButtonEmpty>,
        ]
      }
    />
  );
}
