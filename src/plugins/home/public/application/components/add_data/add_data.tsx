/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, MouseEvent } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ApplicationStart, DocLinksStart } from 'kibana/public';
import { createAppNavigationHandler } from '../app_navigation_handler';
// @ts-expect-error untyped component
import { Synopsis } from '../synopsis';
import { getServices } from '../../kibana_services';
import { RedirectAppLinks } from '../../../../../kibana_react/public';

interface Props {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
  docLinks: DocLinksStart;
}

export const AddData: FC<Props> = ({ addBasePath, application, docLinks }) => {
  const { trackUiMetric } = getServices();

  const { integrations: isIntegrationsEnabled } = application.capabilities.navLinks;

  return (
    <>
      <section className="homDataAdd" aria-labelledby="homDataAdd__title">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id="homDataAdd__title">
                <FormattedMessage
                  id="home.addData.sectionTitle"
                  defaultMessage="Get started by adding your data"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer />

            <EuiText>
              <p>
                <FormattedMessage
                  id="home.addData.text"
                  defaultMessage="To begin your Kibana journey, we recommend adding your data via the Elastic Agent’s suite of data integrations. If the integration or features your looking for aren’t available, give our legacy Beats a try instead."
                />
              </p>
            </EuiText>

            <EuiSpacer />

            <EuiFlexGroup gutterSize="m" responsive={false} wrap>
              {isIntegrationsEnabled ? (
                <EuiFlexItem grow={false}>
                  <RedirectAppLinks application={application}>
                    {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                    <EuiButton
                      fill
                      href={addBasePath('/app/integrations')}
                      onClick={(event: MouseEvent) => {
                        trackUiMetric(METRIC_TYPE.CLICK, 'ingest_data_card_fleet');
                        createAppNavigationHandler('/app/integrations')(event);
                      }}
                    >
                      Find a data integration
                    </EuiButton>
                  </RedirectAppLinks>
                </EuiFlexItem>
              ) : null}

              <EuiFlexItem grow={false}>
                <RedirectAppLinks application={application}>
                  {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                  <EuiButton
                    href={addBasePath('/app/home#/tutorial_directory')}
                    onClick={(event: MouseEvent) => {
                      trackUiMetric(METRIC_TYPE.CLICK, 'home_tutorial_directory');
                      createAppNavigationHandler('/app/home#/tutorial_directory')(event);
                    }}
                  >
                    Setup Beats
                  </EuiButton>
                </RedirectAppLinks>
              </EuiFlexItem>
            </EuiFlexGroup>

            {isIntegrationsEnabled ? (
              <>
                <EuiSpacer />

                <EuiText color="subdued" size="xs">
                  <p>
                    <FormattedMessage
                      id="home.addData.docs"
                      defaultMessage="Confused on which to use? {docsLink}"
                      values={{
                        docsLink: (
                          <EuiLink href={docLinks.links.addData} target="_blank">
                            <FormattedMessage
                              id="home.addData.docsLink"
                              defaultMessage="Check our docs for more information"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
              </>
            ) : null}
          </EuiFlexItem>

          <EuiFlexItem>Image goes here...</EuiFlexItem>
        </EuiFlexGroup>
      </section>

      <EuiHorizontalRule margin="xxl" />
    </>
  );
};
