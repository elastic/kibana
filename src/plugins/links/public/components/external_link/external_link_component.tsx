/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import useMount from 'react-use/lib/useMount';

import { EuiListGroupItem } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  DEFAULT_URL_DRILLDOWN_OPTIONS,
  UrlDrilldownOptions,
} from '@kbn/ui-actions-enhanced-plugin/public';

import {
  EXTERNAL_LINK_TYPE,
  Link,
  LinksLayoutType,
  LINKS_VERTICAL_LAYOUT,
} from '../../../common/content_management';
import { coreServices, trackUiMetric } from '../../services/kibana_services';
import { validateUrl } from './external_link_tools';

export const ExternalLinkComponent = ({
  link,
  layout,
  onRender,
}: {
  link: Link;
  layout: LinksLayoutType;
  onRender: () => void;
}) => {
  const [error, setError] = useState<string | undefined>();

  useMount(() => {
    onRender();
  });

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

  const id = `externalLink--${link.id}`;

  return (
    <EuiListGroupItem
      size="s"
      external
      color="text"
      isDisabled={!link.destination || !isValidUrl}
      className={'linksPanelLink'}
      showToolTip={!isValidUrl}
      toolTipProps={{
        content: error,
        position: layout === LINKS_VERTICAL_LAYOUT ? 'right' : 'bottom',
        repositionOnScroll: true,
        delay: 'long',
        'data-test-subj': `${id}--tooltip`,
      }}
      iconType={error ? 'warning' : undefined}
      id={id}
      label={link.label || link.destination}
      data-test-subj={error ? `${id}--error` : `${id}`}
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
