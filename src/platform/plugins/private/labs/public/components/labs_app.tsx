/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCard,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ApplicationStart } from '@kbn/core/public';
import type { LabId } from '../../common';
import type { InstalledLabsService } from '../services/installed_labs_service';
import type { LabDefinition } from '../types';

interface LabsAppProps {
  application: ApplicationStart;
  installedLabsService: InstalledLabsService;
  labs: readonly LabDefinition[];
}

export const LabsApp = ({ application, installedLabsService, labs }: LabsAppProps) => {
  const [installedLabIds, setInstalledLabIds] = useState<readonly LabId[]>(
    installedLabsService.getInstalledLabIds()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLabId, setPendingLabId] = useState<LabId | null>(null);

  useEffect(() => {
    let isMounted = true;

    void installedLabsService.load().finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    const subscription = installedLabsService
      .getInstalledLabIds$()
      .subscribe((nextInstalledLabIds) => {
        if (isMounted) {
          setInstalledLabIds(nextInstalledLabIds);
        }
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [installedLabsService]);

  const installedLabIdsSet = useMemo(() => new Set(installedLabIds), [installedLabIds]);

  const toggleInstalled = async (labId: LabId, isInstalled: boolean) => {
    setPendingLabId(labId);

    try {
      await installedLabsService.setInstalled(labId, isInstalled);
    } finally {
      setPendingLabId(null);
    }
  };

  return (
    <KibanaPageTemplate
      data-test-subj="labsMarketplaceApp"
      pageHeader={{
        iconType: 'flask',
        pageTitle: i18n.translate('labs.pageTitle', {
          defaultMessage: 'Labs',
        }),
      }}
    >
      <KibanaPageTemplate.Section>
        <EuiText>
          <p>
            <FormattedMessage
              id="labs.pageDescription"
              defaultMessage="Labs is a marketplace for experimental Kibana apps. Install an app to add it to navigation for your user, or uninstall it to remove it."
            />
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFlexGrid columns={2}>
          {labs.map((lab) => {
            const isInstalled = installedLabIdsSet.has(lab.id);
            const isPending = pendingLabId === lab.id;

            return (
              <EuiFlexItem key={lab.id}>
                <EuiCard
                  data-test-subj={`labsMarketplaceCard-${lab.id}`}
                  icon={<EuiIcon aria-hidden={true} type={lab.euiIconType} size="xxl" />}
                  title={lab.title}
                  description={lab.description}
                  footer={
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        {isInstalled ? (
                          <EuiBadge color="success" data-test-subj={`labsInstalledBadge-${lab.id}`}>
                            <FormattedMessage
                              id="labs.installedBadgeLabel"
                              defaultMessage="Installed"
                            />
                          </EuiBadge>
                        ) : (
                          <EuiBadge color="hollow" data-test-subj={`labsAvailableBadge-${lab.id}`}>
                            <FormattedMessage
                              id="labs.availableBadgeLabel"
                              defaultMessage="Available"
                            />
                          </EuiBadge>
                        )}
                      </EuiFlexItem>
                      <EuiFlexItem />
                      {isInstalled ? (
                        <>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              data-test-subj={`labsOpenButton-${lab.id}`}
                              flush="right"
                              onClick={() => application.navigateToApp(lab.appId)}
                            >
                              {i18n.translate('labs.openAppButtonLabel', {
                                defaultMessage: 'Open',
                              })}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              color="danger"
                              data-test-subj={`labsUninstallButton-${lab.id}`}
                              isLoading={isPending}
                              onClick={() => toggleInstalled(lab.id, false)}
                              size="s"
                            >
                              {i18n.translate('labs.uninstallButtonLabel', {
                                defaultMessage: 'Uninstall',
                              })}
                            </EuiButton>
                          </EuiFlexItem>
                        </>
                      ) : (
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            data-test-subj={`labsInstallButton-${lab.id}`}
                            fill
                            isLoading={isPending || isLoading}
                            onClick={() => toggleInstalled(lab.id, true)}
                            size="s"
                          >
                            {i18n.translate('labs.installButtonLabel', {
                              defaultMessage: 'Install',
                            })}
                          </EuiButton>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  }
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>

        {labs.length === 0 ? (
          <>
            <EuiSpacer size="l" />
            <EuiEmptyPrompt
              iconType="flask"
              title={
                <h2>
                  <FormattedMessage
                    id="labs.emptyStateTitle"
                    defaultMessage="No Labs apps are registered yet"
                  />
                </h2>
              }
              body={
                <p>
                  <FormattedMessage
                    id="labs.emptyStateDescription"
                    defaultMessage="Add a new Labs definition to make it installable from this marketplace."
                  />
                </p>
              }
            />
          </>
        ) : null}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
