/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiCard, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { HelpCenterContext } from './help_center_header_nav_button';

export const DocumentationCards = () => {
  const { helpLinks } = useContext(HelpCenterContext);
  const domNode = useRef<HTMLDivElement>(null);

  let customContent = null;
  let customLinks = null;
  if (helpLinks?.helpExtension) {
    const { appName, links, content } = helpLinks.helpExtension;

    customLinks =
      links &&
      links.map((link, index) => {
        switch (link.linkType) {
          case 'documentation': {
            const { linkType, href, iconType, ...rest } = link;
            return (
              <EuiFlexItem key={'kibana_docs'}>
                <EuiCard
                  icon={iconType ? <EuiIcon size="xl" type={iconType} /> : undefined}
                  title={appName}
                  description="Example of a card's description. Stick to one or two sentences."
                  target="_blank"
                  href={href}
                  {...rest}
                />
              </EuiFlexItem>
            );
          }
          default:
            break;
        }
      });
    if (content && domNode.current) {
      console.log('HERE!!');
      customContent = content(domNode.current, { hideHelpMenu: () => {} });
    }
  }

  useEffect(() => {
    if (helpLinks?.helpExtension) {
      const { content } = helpLinks.helpExtension;

      if (content && domNode.current) {
        console.log('HERE!!');
        customContent = content(domNode.current, { hideHelpMenu: () => {} });
      }
      console.log(customContent, domNode.current);
    }
  }, [domNode]);

  return (
    <>
      <div ref={domNode} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l">
        {customLinks}
        <EuiFlexItem key={'kibana_docs'}>
          <EuiCard
            icon={<EuiIcon size="xl" type={`logoKibana`} />}
            title={
              <FormattedMessage
                id="core.ui.chrome.headerGlobalNav.helpMenuKibanaDocumentationTitle"
                defaultMessage="Kibana"
              />
            }
            description="Example of a card's description. Stick to one or two sentences."
            target="_blank"
            href={helpLinks?.kibanaDocLink}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
