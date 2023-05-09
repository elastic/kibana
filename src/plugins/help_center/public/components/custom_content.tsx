/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';

import { HelpCenterContext } from './help_center_header_nav_button';
import { IntlProvider } from 'react-intl';

export const CustomContentTab = () => {
  const { helpFetchResults: helpLinks } = useContext(HelpCenterContext);
  const domNode = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (helpLinks?.helpExtension) {
      const { content } = helpLinks.helpExtension;

      if (content && domNode.current) {
        content(domNode.current, { hideHelpMenu: () => {} });
      }
    }
  }, [domNode, helpLinks?.helpExtension]);

  return (
    <>
      <IntlProvider>
        <div ref={domNode} />
      </IntlProvider>
    </>
  );
};
