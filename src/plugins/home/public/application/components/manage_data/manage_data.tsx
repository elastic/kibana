/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, MouseEvent } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ApplicationStart } from 'kibana/public';
import { FeatureCatalogueEntry } from '../../../services';
import { createAppNavigationHandler } from '../app_navigation_handler';
// @ts-expect-error untyped component
import { Synopsis } from '../synopsis';
import { getServices } from '../../kibana_services';
/** @deprecated Use `RedirectAppLinks` from `@kbn/shared-ux-components */
import { RedirectAppLinks } from '../../../../../kibana_react/public';

interface Props {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
  features: FeatureCatalogueEntry[];
}

export const ManageData: FC<Props> = ({ addBasePath, application, features }) => {
  const { share, trackUiMetric } = getServices();
  const consoleHref = share.url.locators.get('CONSOLE_APP_LOCATOR')?.useUrl({});
  const managementHref = share.url.locators
    .get('MANAGEMENT_APP_LOCATOR')
    ?.useUrl({ sectionId: '' });

  if (features.length) {
    const { management: isManagementEnabled, dev_tools: isDevToolsEnabled } =
      application.capabilities.navLinks;

    return (
      <>
        <section
          className="homDataManage"
          aria-labelledby="homDataManage__title"
          data-test-subj="homDataManage"
        >
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={1}>
              <EuiTitle size="s">
                <h2 id="homDataManage__title">
                  <FormattedMessage id="home.manageData.sectionTitle" defaultMessage="Management" />
                </h2>
              </EuiTitle>
            </EuiFlexItem>

            {isDevToolsEnabled || isManagementEnabled ? (
              <EuiFlexItem className="homDataManage__actions" grow={false}>
                <EuiFlexGroup alignItems="center" responsive={false} wrap>
                  {/* Check if both the Dev Tools UI and the Console UI are enabled. */}
                  {isDevToolsEnabled && consoleHref !== undefined ? (
                    <EuiFlexItem grow={false}>
                      <RedirectAppLinks application={application}>
                        <EuiButtonEmpty
                          data-test-subj="homeDevTools"
                          className="kbnOverviewPageHeader__actionButton"
                          flush="both"
                          iconType="wrench"
                          href={consoleHref}
                        >
                          <FormattedMessage
                            id="home.manageData.devToolsButtonLabel"
                            defaultMessage="Dev Tools"
                          />
                        </EuiButtonEmpty>
                      </RedirectAppLinks>
                    </EuiFlexItem>
                  ) : null}

                  {isManagementEnabled ? (
                    <EuiFlexItem grow={false}>
                      <RedirectAppLinks application={application}>
                        <EuiButtonEmpty
                          data-test-subj="homeManage"
                          className="kbnOverviewPageHeader__actionButton"
                          flush="both"
                          iconType="gear"
                          href={managementHref}
                        >
                          <FormattedMessage
                            id="home.manageData.stackManagementButtonLabel"
                            defaultMessage="Stack Management"
                          />
                        </EuiButtonEmpty>
                      </RedirectAppLinks>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>

          <EuiSpacer />

          <EuiFlexGroup className="homDataManage__content">
            {features.map((feature) => (
              <EuiFlexItem className="homDataManage__item" key={feature.id}>
                <Synopsis
                  description={feature.description}
                  iconType={feature.icon}
                  id={feature.id}
                  onClick={(event: MouseEvent) => {
                    trackUiMetric(METRIC_TYPE.CLICK, `manage_data_card_${feature.id}`);
                    createAppNavigationHandler(feature.path)(event);
                  }}
                  title={feature.title}
                  url={addBasePath(feature.path)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </section>

        <EuiHorizontalRule margin="xxl" />
      </>
    );
  } else {
    return null;
  }
};
