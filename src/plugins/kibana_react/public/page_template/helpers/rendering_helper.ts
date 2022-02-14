/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPageSideBarProps } from '@elastic/eui';
import classNames from 'classnames';

export const getPageSideBarProps = (
  solutionNav: boolean,
  shouldApplyShrinkingClass: boolean,
  pageSideBarProps?: EuiPageSideBarProps
): EuiPageSideBarProps => {
  let sideBarClasses = 'kbnPageTemplate__pageSideBar';
  if (solutionNav) {
    // Only apply shrinking classes if collapsibility is available through `solutionNav`
    sideBarClasses = classNames(sideBarClasses, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'kbnPageTemplate__pageSideBar--shrink': shouldApplyShrinkingClass,
    });
  }
  return {
    paddingSize: solutionNav ? 'none' : 'l',
    ...pageSideBarProps,
    className: classNames(sideBarClasses, pageSideBarProps?.className),
  };
};

export const getClasses = (template?: string, className?: string) => {
  return classNames('kbnPageTemplate', { [`kbnPageTemplate--${template}`]: template }, className);
};
