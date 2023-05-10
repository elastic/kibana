/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

import { HelpCenterContext } from './help_center_header_nav_button';

export const CustomContent = () => {
  const { helpFetchResults } = useContext(HelpCenterContext);
  const domNode = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (domNode.current) {
      if (helpFetchResults?.custom) {
        helpFetchResults.custom(domNode.current, { hideHelpMenu: () => {} });
      } else {
        ReactDOM.unmountComponentAtNode(domNode.current);
      }
    }
  }, [domNode, helpFetchResults]);

  return (
    <>
      <div ref={domNode} />
    </>
  );
};
