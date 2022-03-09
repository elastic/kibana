/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';
import { compressToEncodedURIComponent } from 'lz-string';

import { ApplicationStart } from 'src/core/public';
import type { UrlService } from 'src/plugins/share/common/url_service';

interface Props {
  request: string;
  navigateToUrl?: ApplicationStart['navigateToUrl'];
  urlService?: UrlService;
  canShowDevtools?: boolean;
}

export const useOpenInConsole = ({ request, navigateToUrl, urlService }: Props) => {
  const [consolePreviewLink, setConsolePreviewLink] = useState<string | undefined>();

  useEffect(() => {
    const getUrl = async () => {
      const devToolsDataUri = compressToEncodedURIComponent(request);
      const link = await urlService?.locators
        .get('CONSOLE_APP_LOCATOR')
        ?.getUrl({ loadFrom: `data:text/plain,${devToolsDataUri}` });

      setConsolePreviewLink(link);
    };

    getUrl();
  }, [request, urlService]);

  const consolePreviewClick = useCallback(
    () => consolePreviewLink && navigateToUrl && navigateToUrl(consolePreviewLink),
    [consolePreviewLink, navigateToUrl]
  );

  return {
    consolePreviewClick,
    consolePreviewLink,
  };
};
