/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { Logo, type Props } from './logo';

export const Loader = (props: Props) => (
  <div className="kbnWelcomeView" id="kbn_loading_message" data-test-subj="kbnLoadingMessage">
    <div className="kbnLoaderWrap">
      <Logo {...props} />
      <div className="kbnWelcomeText">Loading Project</div>
      <div className="kbnProgress" />
    </div>
  </div>
);
