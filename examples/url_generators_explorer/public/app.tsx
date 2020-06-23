/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
import { AppMountParameters } from '../../../src/core/public';
import { UrlGeneratorsService } from '../../../src/plugins/share/public';
import {
  HELLO_URL_GENERATOR,
  HELLO_URL_GENERATOR_V1,
} from '../../url_generators_examples/public/url_generator';

interface Props {
  getLinkGenerator: UrlGeneratorsService['getUrlGenerator'];
}

interface MigratedLink {
  isDeprecated: boolean;
  linkText: string;
  link: string;
}

const ActionsExplorer = ({ getLinkGenerator }: Props) => {
  const [migratedLinks, setMigratedLinks] = useState([] as MigratedLink[]);
  const [buildingLinks, setBuildingLinks] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  /**
   * Lets pretend we grabbed these links from a persistent store, like a saved object.
   * Some of these links were created with older versions of the hello link generator.
   * They use deprecated generator ids.
   */
  const [persistedLinks, setPersistedLinks] = useState([
    {
      id: HELLO_URL_GENERATOR_V1,
      linkText: 'Say hello to Mary',
      state: {
        name: 'Mary',
      },
    },
    {
      id: HELLO_URL_GENERATOR,
      linkText: 'Say hello to George',
      state: {
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
          const generator = getLinkGenerator(savedLink.id);
          const link = await generator.createUrl(savedLink.state);
          return {
            isDeprecated: generator.isDeprecated,
            linkText: savedLink.linkText,
            link,
          };
        })
      );
      setMigratedLinks(updatedLinks);
      setBuildingLinks(false);
    };

    updateLinks();
  }, [getLinkGenerator, persistedLinks]);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>Access links explorer</EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiText>
              <p>Create new links using the most recent version of a url generator.</p>
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
                    id: HELLO_URL_GENERATOR,
                    state: { firstName, lastName },
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
                generators are in red. This can be useful for developers to know they will have to
                migrate persisted state or in a future version of Kibana, these links may no longer
                work. They still work now because legacy url generators must provide a state
                migration function.
              </p>
            </EuiText>
            {buildingLinks ? (
              <div>loading...</div>
            ) : (
              migratedLinks.map((link) => (
                <React.Fragment>
                  <EuiLink
                    color={link.isDeprecated ? 'danger' : 'primary'}
                    data-test-subj="linkToHelloPage"
                    href={link.link}
                    target="_blank"
                  >
                    {link.linkText}
                  </EuiLink>
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
