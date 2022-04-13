/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import { imgData } from './shared_poc_print_ui_logo';

interface Props {
  title: string;
  logo?: string;
}

export const SharedPocPrintUi: FunctionComponent<Props> = ({ title, logo = imgData }) => {
  return (
    <>
      {/* NOTE: This UI is purely for test purposes, but it is easy to see how we could move this to some external place that shares this functionality. */}
      <header className="printHeader">{title}</header>
      <footer className="printFooter">
        <img
          alt="a cool logo for branding"
          // We could make this image src dynamic to support injecting branding per Kibana deployment
          src={logo}
        />
        {/*
          Currently pageNumber is not being used, but the idea was to try and use JS to count the pages and populate
          the repeated element, could not get this working
         */}
        <div className="pageNumber" />
      </footer>
    </>
  );
};
