/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import {
  UrlDrilldownOptions,
  DEFAULT_URL_DRILLDOWN_OPTIONS,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { EuiListGroupItem } from '@elastic/eui';

import { coreServices } from '../../services/kibana_services';
import { NavigationEmbeddableLink } from '../../../common/content_management';

export const ExternalLinkComponent = ({ link }: { link: NavigationEmbeddableLink }) => {
  const linkOptions = useMemo(() => {
    return {
      ...DEFAULT_URL_DRILLDOWN_OPTIONS,
      ...link.options,
    } as UrlDrilldownOptions;
  }, [link.options]);

  const destination = useMemo(() => {
    return linkOptions.encodeUrl ? encodeURI(link.destination) : link.destination;
  }, [linkOptions, link.destination]);

  return (
    <EuiListGroupItem
      size="s"
      color="text"
      className={'navigationLink'}
      id={`externalLink--${link.id}`}
      label={link.label || link.destination}
      href={destination}
      onClick={async (event) => {
        /** Only use `navigateToUrl` if we **aren't** opening in a new window/tab; otherwise, just use default href handling */
        const modifiedClick = event.ctrlKey || event.metaKey || event.shiftKey;
        if (!modifiedClick) {
          event.preventDefault();
          if (linkOptions.openInNewTab) {
            window.open(destination, '_blank');
          } else {
            await coreServices.application.navigateToUrl(destination);
          }
        }
      }}
    />
  );
};
