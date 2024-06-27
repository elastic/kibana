/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AirdropService } from './airdrop_service';
import { AirdropOverlay } from './components/airdrop_overlay';

interface Deps {
  airdropService: AirdropService;
}

interface MountParams {
  element: HTMLElement;
}

export const mountOverlay = ({ airdropService }: Deps, { element }: MountParams) => {
  ReactDOM.render(<AirdropOverlay airdropService={airdropService} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
