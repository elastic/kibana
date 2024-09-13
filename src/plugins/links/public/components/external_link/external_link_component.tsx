/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiListGroupItem } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  DEFAULT_URL_DRILLDOWN_OPTIONS,
  UrlDrilldownOptions,
} from '@kbn/ui-actions-enhanced-plugin/public';

import {
  EXTERNAL_LINK_TYPE,
  LinksLayoutType,
  LINKS_VERTICAL_LAYOUT,
} from '../../../common/content_management';
import { coreServices, trackUiMetric } from '../../services/kibana_services';
import { ResolvedLink } from '../../types';

export const ExternalLinkComponent = ({
  link,
  layout,
}: {
  link: ResolvedLink;
  layout: LinksLayoutType;
}) => {
  const linkOptions = useMemo(() => {
    return {
      ...DEFAULT_URL_DRILLDOWN_OPTIONS,
      ...link.options,
    } as UrlDrilldownOptions;
  }, [link.options]);

  const destination = useMemo(() => {
    return link.destination && linkOptions.encodeUrl
      ? encodeURI(link.destination)
      : link.destination;
  }, [linkOptions, link.destination]);

  const id = `externalLink--${link.id}`;

  return (
    <EuiListGroupItem
      size="s"
      external
      color="text"
      isDisabled={Boolean(link.error)}
      className={'linksPanelLink'}
      showToolTip={Boolean(link.error)}
      toolTipProps={{
        content: link.error?.message,
        position: layout === LINKS_VERTICAL_LAYOUT ? 'right' : 'bottom',
        repositionOnScroll: true,
        delay: 'long',
        'data-test-subj': `${id}--tooltip`,
      }}
      iconType={link.error ? 'warning' : undefined}
      id={id}
      label={link.label || link.destination}
      data-test-subj={link.error ? `${id}--error` : `${id}`}
      href={destination}
      onClick={async (event) => {
        if (!destination) return;

        trackUiMetric?.(METRIC_TYPE.CLICK, `${EXTERNAL_LINK_TYPE}:click`);

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
