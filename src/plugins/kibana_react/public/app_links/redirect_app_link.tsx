/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useRef, useMemo } from 'react';
import classNames from 'classnames';
import useObservable from 'react-use/lib/useObservable';
import { ApplicationStart } from 'src/core/public';
import { createNavigateToUrlClickHandler } from './click_handler';

interface RedirectCrossAppLinksProps extends React.HTMLAttributes<HTMLDivElement> {
  application: ApplicationStart;
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
 * <RedirectCrossAppLinks application={application}>
 *   <a href="/base-path/app/another-app/some-path">Go to another-app</a>
 * </RedirectCrossAppLinks>
 * ```
 *
 * @remarks
 * It is recommended to use the component at the highest possible level of the component tree that would
 * require to handle the links. A good practice is to consider it as a context provider and to use it
 * at the root level of an application or of the page that require the feature.
 *
 * @deprecated use RedirectAppLinks from @kbn-shared-ux-components
 */

export const RedirectAppLinks: FunctionComponent<RedirectCrossAppLinksProps> = ({
  application,
  children,
  className,
  ...otherProps
}) => {
  const currentAppId = useObservable(application.currentAppId$, undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const clickHandler = useMemo(
    () =>
      containerRef.current && currentAppId
        ? createNavigateToUrlClickHandler({
            container: containerRef.current,
            navigateToUrl: application.navigateToUrl,
          })
        : undefined,
    [containerRef.current, application, currentAppId]
  );

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      ref={containerRef}
      className={classNames(className, 'kbnRedirectCrossAppLinks')}
      onClick={clickHandler}
      {...otherProps}
    >
      {children}
    </div>
  );
};
