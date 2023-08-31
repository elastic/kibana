/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import {
  UrlDrilldownOptions,
  DEFAULT_URL_DRILLDOWN_OPTIONS,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { EuiListGroupItem } from '@elastic/eui';

import { validateUrl } from './external_link_tools';
import { coreServices } from '../../services/kibana_services';
import {
  NavigationEmbeddableLink,
  NavigationLayoutType,
  NAV_VERTICAL_LAYOUT,
} from '../../../common/content_management';

export const ExternalLinkComponent = ({
  link,
  layout,
}: {
  link: NavigationEmbeddableLink;
  layout: NavigationLayoutType;
}) => {
  const [error, setError] = useState<string | undefined>();

  const linkOptions = useMemo(() => {
    return {
      ...DEFAULT_URL_DRILLDOWN_OPTIONS,
      ...link.options,
    } as UrlDrilldownOptions;
  }, [link.options]);

  const isValidUrl = useMemo(() => {
    if (!link.destination) return false;
    const { valid, message } = validateUrl(link.destination);
    if (!valid) setError(message);
    return valid;
  }, [link.destination]);

  const destination = useMemo(() => {
    return link.destination && linkOptions.encodeUrl
      ? encodeURI(link.destination)
      : link.destination;
  }, [linkOptions, link.destination]);

  return (
    <EuiListGroupItem
      size="s"
      color="text"
      isDisabled={!link.destination || !isValidUrl}
      className={'navigationLink'}
      showToolTip={!isValidUrl}
      toolTipProps={{
        content: error,
        position: layout === NAV_VERTICAL_LAYOUT ? 'right' : 'bottom',
        repositionOnScroll: true,
        delay: 'long',
      }}
      iconType={error ? 'warning' : undefined}
      id={`externalLink--${link.id}`}
      label={link.label || link.destination}
      href={destination}
      onClick={async (event) => {
        if (!destination) return;

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
