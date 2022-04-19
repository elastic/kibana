/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import { imgData } from './elastic_logo';

import './print_header_and_footer.scss';

interface Props {
  title: string;
  logo?: string;
}

export const PrintHeaderAndFooter: FunctionComponent<Props> = ({ title, logo = imgData }) => {
  return (
    <>
      <header className="printHeader">{title}</header>
      <footer className="printFooter">
        <img
          alt="" // We can leave this alt blank since this should not be visible to users in the browser
          src={logo}
        />
      </footer>
    </>
  );
};
