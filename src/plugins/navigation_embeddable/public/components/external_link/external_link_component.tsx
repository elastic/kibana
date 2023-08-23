/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiListGroupItem } from '@elastic/eui';
import { UrlDrilldownOptions } from '@kbn/ui-actions-enhanced-plugin/public';

import { coreServices } from '../../services/kibana_services';
import { NavigationEmbeddableLink } from '../../../common/content_management';

export const ExternalLinkComponent = ({ link }: { link: NavigationEmbeddableLink }) => {
  return (
    <EuiListGroupItem
      size="s"
      color="text"
      className={'navigationLink'}
      id={`externalLink--${link.id}`}
      label={link.label || link.destination}
      onClick={async () => {
        const destination =
          !link.options || (link.options as UrlDrilldownOptions)?.encodeUrl
            ? encodeURI(link.destination)
            : link.destination;
        if (!link.options || link.options.openInNewTab) {
          window.open(destination, '_blank', 'noopener');
        } else {
          await coreServices.application.navigateToUrl(destination);
        }
      }}
    />
  );
};
