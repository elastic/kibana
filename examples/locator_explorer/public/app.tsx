/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { EuiPage } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { EuiPageBody } from '@elastic/eui';
import { EuiPageContent } from '@elastic/eui';
import { EuiPageContentBody } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { EuiPageHeader } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { AppMountParameters } from '@kbn/core/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import {
  HelloLocatorV1Params,
  HelloLocatorV2Params,
  HELLO_LOCATOR,
} from '@kbn/locator-examples-plugin/public';

interface Props {
  share: SharePluginSetup;
}

interface MigratedLink {
  linkText: string;
  link: string;
  version: string;
  params: HelloLocatorV1Params | HelloLocatorV2Params;
}

const ActionsExplorer = ({ share }: Props) => {
  const [migratedLinks, setMigratedLinks] = useState([] as MigratedLink[]);
  const [buildingLinks, setBuildingLinks] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  /**
   * Lets pretend we grabbed these links from a persistent store, like a saved object.
   * Some of these links were created with older versions of the hello locator.
   */
  const [persistedLinks, setPersistedLinks] = useState<
    Array<{
      id: string;
      version: string;
      linkText: string;
      params: HelloLocatorV1Params | HelloLocatorV2Params;
    }>
  >([
    {
      id: HELLO_LOCATOR,
      version: '0.0.1',
      linkText: 'Say hello to Mary',
      params: {
        name: 'Mary',
      },
    },
    {
      id: HELLO_LOCATOR,
      version: '0.0.2',
      linkText: 'Say hello to George',
      params: {
        firstName: 'George',
        lastName: 'Washington',
      },
    },
  ]);

  useEffect(() => {
    setBuildingLinks(true);

    const updateLinks = async () => {
      const updatedLinks = await Promise.all(
        persistedLinks.map(async (savedLink) => {
          const locator = share.url.locators.get(savedLink.id);
          if (!locator) return;
          let params: HelloLocatorV1Params | HelloLocatorV2Params = savedLink.params;
          if (savedLink.version === '0.0.1') {
            const migrations =
              typeof locator.migrations === 'function'
                ? locator.migrations()
                : locator.migrations || {};
            const migration = migrations['0.0.2'];
            if (migration) {
              params = migration(params) as HelloLocatorV2Params;
            }
          }
          const link = await locator.getUrl(params, { absolute: false });
          return {
            linkText: savedLink.linkText,
            link,
            version: savedLink.version,
            params: savedLink.params,
          } as MigratedLink;
        })
      );
      setMigratedLinks(updatedLinks as MigratedLink[]);
      setBuildingLinks(false);
    };

    updateLinks();
  }, [share, persistedLinks]);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>Locator explorer</EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiText>
              <p>Create new links using the most recent version of a locator.</p>
            </EuiText>
            <EuiFieldText
              prepend="First name"
              onChange={(e) => {
                setFirstName(e.target.value);
              }}
            />
            <EuiFieldText prepend="Last name" onChange={(e) => setLastName(e.target.value)} />
            <EuiButton
              onClick={() =>
                setPersistedLinks([
                  ...persistedLinks,
                  {
                    id: HELLO_LOCATOR,
                    version: '0.0.2',
                    params: { firstName, lastName },
                    linkText: `Say hello to ${firstName} ${lastName}`,
                  },
                ])
              }
            >
              Add new link
            </EuiButton>
            <EuiSpacer />

            <EuiText>
              <p>
                Existing links retrieved from storage. The links that were generated from legacy
                locators are in red. This can be useful for developers to know they will have to
                migrate persisted state or in a future version of Kibana, these links may no longer
                work. They still work now because legacy locators must provide state migration
                functions.
              </p>
            </EuiText>
            {buildingLinks ? (
              <div>loading...</div>
            ) : (
              migratedLinks.map((link) => (
                <React.Fragment>
                  <EuiLink
                    color={link.version !== '0.0.2' ? 'danger' : 'primary'}
                    data-test-subj="linkToHelloPage"
                    href={link.link}
                    target="_blank"
                  >
                    {link.linkText}
                  </EuiLink>{' '}
                  (
                  <EuiLink
                    color={link.version !== '0.0.2' ? 'danger' : 'primary'}
                    data-test-subj="linkToHelloPage"
                    href={share.url.locators.get('HELLO_LOCATOR')?.getRedirectUrl(link.params)}
                    target="_blank"
                  >
                    through redirect app
                  </EuiLink>
                  )
                  <br />
                </React.Fragment>
              ))
            )}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const renderApp = (props: Props, { element }: AppMountParameters) => {
  ReactDOM.render(<ActionsExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
