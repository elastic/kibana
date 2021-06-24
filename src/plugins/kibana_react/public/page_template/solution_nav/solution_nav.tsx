/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './solution_nav.scss';

import React, { FunctionComponent, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiTitle, EuiSideNav, EuiSideNavProps, htmlIdGenerator } from '@elastic/eui';

import {
  KibanaPageTemplateSolutionNavAvatar,
  KibanaPageTemplateSolutionNavAvatarProps,
} from './solution_nav_avatar';

export type KibanaPageTemplateSolutionNavProps = Partial<EuiSideNavProps<{}>> & {
  /**
   * Name of the solution, i.e. "Observability"
   */
  name: KibanaPageTemplateSolutionNavAvatarProps['name'];
  /**
   * Solution logo, i.e. "logoObservability"
   */
  icon?: KibanaPageTemplateSolutionNavAvatarProps['iconType'];
};

/**
 * A wrapper around EuiSideNav but also creates the appropriate title with optional solution logo
 */
export const KibanaPageTemplateSolutionNav: FunctionComponent<KibanaPageTemplateSolutionNavProps> = ({
  name,
  icon,
  items,
  ...rest
}) => {
  const [isSideNavOpenOnMobile, setisSideNavOpenOnMobile] = useState(false);
  const toggleOpenOnMobile = () => {
    setisSideNavOpenOnMobile(!isSideNavOpenOnMobile);
  };

  /**
   * Create the avatar.
   */
  let solutionAvatar;
  if (icon) {
    solutionAvatar = <KibanaPageTemplateSolutionNavAvatar iconType={icon} name={name} />;
  }

  /**
   * Create the required title.
   * a11y: Since the heading can't be nested inside `<nav>`, we have to hook them up via `aria-labelledby`
   */
  const titleID = htmlIdGenerator('kbnPageTemplateSolutionNav__title')();
  const solutionNavTitle = (
    <EuiTitle size="xs" id={titleID} className="kbnPageTemplateSolutionNav__title">
      <h2>
        {solutionAvatar}
        <strong>{name}</strong>
      </h2>
    </EuiTitle>
  );

  /**
   * Create the side nav component
   */
  let sideNav;
  if (items) {
    const mobileTitleText = (
      <FormattedMessage
        id="kibana-react.pageTemplate.solutionNav.mobileTitleText"
        defaultMessage="{solutionName} Menu"
        values={{ solutionName: name || 'Navigation' }}
      />
    );

    sideNav = (
      <EuiSideNav
        aria-labelledby={titleID}
        mobileTitle={
          <h2>
            {solutionAvatar}
            {mobileTitleText}
          </h2>
        }
        toggleOpenOnMobile={toggleOpenOnMobile}
        isOpenOnMobile={isSideNavOpenOnMobile}
        items={items}
        {...rest}
      />
    );
  }

  return (
    <div className="kbnPageTemplateSolutionNav">
      {solutionNavTitle}
      {sideNav}
    </div>
  );
};
