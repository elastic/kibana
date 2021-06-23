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

import { EuiSideNav, EuiSideNavProps } from '@elastic/eui';

import {
  KibanaPageTemplateSolutionNavAvatar,
  KibanaPageTemplateSolutionNavAvatarProps,
} from './solution_nav_avatar';

export type KibanaPageTemplateSolutionNavProps = Partial<EuiSideNavProps> & {
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
   * Create the side nav component
   */
  let sideNav;
  if (items) {
    const solutionNavTitle = (
      <>
        {solutionAvatar}
        <strong>{name}</strong>
      </>
    );

    const mobileTitleText = (
      <FormattedMessage
        id="kibana-react.pageTemplate.solutionNav.mobileTitleText"
        defaultMessage="{solutionName} Menu"
        values={{ solutionName: name || 'Navigation' }}
      />
    );

    sideNav = (
      <EuiSideNav
        heading={solutionNavTitle}
        mobileTitle={
          <>
            {solutionAvatar}
            {mobileTitleText}
          </>
        }
        toggleOpenOnMobile={toggleOpenOnMobile}
        isOpenOnMobile={isSideNavOpenOnMobile}
        items={items}
        {...rest}
      />
    );
  }

  return <div className="kbnPageTemplateSolutionNav">{sideNav}</div>;
};
