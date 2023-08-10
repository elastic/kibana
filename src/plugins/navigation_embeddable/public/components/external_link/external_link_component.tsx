/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { NavigationLinkInfo } from '../../embeddable/types';
import { EXTERNAL_LINK_TYPE, NavigationEmbeddableLink } from '../../../common/content_management';

export const ExternalLinkComponent = ({ link }: { link: NavigationEmbeddableLink }) => {
  return (
    <EuiButtonEmpty iconType={NavigationLinkInfo[EXTERNAL_LINK_TYPE].icon}>
      {link.label || link.destination}
    </EuiButtonEmpty>
  );
};
