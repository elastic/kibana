/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useRef, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { ApplicationStart } from 'src/core/public';
import { createNavigateToUrlClickHandler } from './click_handler';

type Props = React.HTMLAttributes<HTMLDivElement> &
  Pick<ApplicationStart, 'navigateToUrl' | 'currentAppId$'>;

export interface RedirectAppLinksProps extends Props {
  className?: string;
  'data-test-subj'?: string;
}

/**
 * Utility component that will intercept click events on children anchor (`<a>`) elements to call
 * `application.navigateToUrl` with the link's href. This will trigger SPA friendly navigation
 * when the link points to a valid Kibana app.
 *
 * @example
 * ```tsx
 * <RedirectAppLinks navigateToUrl={() => url} currentAppId$={observableAppId}>
 *   <a href="/base-path/app/another-app/some-path">Go to another-app</a>
 * </RedirectAppLinks>
 * ```
 *
 * @remarks
 * It is recommended to use the component at the highest possible level of the component tree that would
 * require to handle the links. A good practice is to consider it as a context provider and to use it
 * at the root level of an application or of the page that require the feature.
 */
export const RedirectAppLinks: FunctionComponent<RedirectAppLinksProps> = ({
  navigateToUrl,
  currentAppId$,
  children,
  ...otherProps
}) => {
  const currentAppId = useObservable(currentAppId$, undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickHandler = useMemo(
    () =>
      containerRef.current && currentAppId
        ? createNavigateToUrlClickHandler({
            container: containerRef.current,
            navigateToUrl,
          })
        : undefined,
    [currentAppId, navigateToUrl]
  );

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div ref={containerRef} {...otherProps} onClick={clickHandler}>
      {children}
    </div>
  );
};
