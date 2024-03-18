/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSwitchProps,
  EuiSwitch,
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { Connector, SchedulingConfiguraton, SyncJobType } from '../../types/connectors';
import { PlatinumLicensePopover } from '../configuration/platinum_license_popover';
import { ConnectorCronEditor } from './connector_cron_editor';
export interface ConnectorContentSchedulingProps {
  connector: Connector;
  dataTelemetryIdPrefix: string;
  hasPlatinumLicense?: boolean;
  hasSyncTypeChanges: boolean;
  setHasChanges: (hasChanges: boolean) => void;
  setHasSyncTypeChanges: (state: boolean) => void;
  type: SyncJobType;
  updateConnectorStatus: boolean;
  updateScheduling: (configuration: SchedulingConfiguraton) => void;
}
const getAccordionTitle = (type: ConnectorContentSchedulingProps['type']) => {
  switch (type) {
    case SyncJobType.FULL: {
      return i18n.translate(
        'searchConnectors.content.indices.connectorScheduling.accordion.fullSync.title',
        { defaultMessage: 'Full content sync' }
      );
    }
    case SyncJobType.INCREMENTAL: {
      return i18n.translate(
        'searchConnectors.content.indices.connectorScheduling.accordion.incrementalSync.title',
        { defaultMessage: 'Incremental content sync' }
      );
    }
    case SyncJobType.ACCESS_CONTROL: {
      return i18n.translate(
        'searchConnectors.content.indices.connectorScheduling.accordion.accessControlSync.title',
        { defaultMessage: 'Access Control Sync' }
      );
    }
  }
};
const getDescriptionText = (type: ConnectorContentSchedulingProps['type']) => {
  switch (type) {
    case SyncJobType.FULL: {
      return i18n.translate(
        'searchConnectors.content.indices.connectorScheduling.accordion.fullSync.description',
        { defaultMessage: 'Synchronize all data from your data source.' }
      );
    }
    case SyncJobType.INCREMENTAL: {
      return i18n.translate(
        'searchConnectors.content.indices.connectorScheduling.accordion.incrementalSync.description',
        {
          defaultMessage:
            'A lightweight sync job that only fetches updated content from your data source.',
        }
      );
    }
    case SyncJobType.ACCESS_CONTROL: {
      return i18n.translate(
        'searchConnectors.content.indices.connectorScheduling.accordion.accessControlSync.description',
        { defaultMessage: 'Schedule access control syncs to keep permissions mappings up to date.' }
      );
    }
  }
};

const EnableSwitch: React.FC<{
  checked: boolean;
  disabled: boolean;
  onChange: EuiSwitchProps['onChange'];
}> = ({ disabled, checked, onChange }) => (
  <EuiSwitch
    disabled={disabled}
    checked={checked}
    label={i18n.translate('searchConnectors.content.indices.connectorScheduling.switch.label', {
      defaultMessage: 'Enabled',
    })}
    onChange={onChange}
  />
);

export const ConnectorContentScheduling: React.FC<ConnectorContentSchedulingProps> = ({
  connector,
  dataTelemetryIdPrefix,
  setHasSyncTypeChanges,
  hasPlatinumLicense = false,
  hasSyncTypeChanges,
  type,
  updateConnectorStatus,
  updateScheduling,
}) => {
  const schedulingInput = connector.scheduling;
  const [scheduling, setScheduling] = useState(schedulingInput);
  const [isAccordionOpen, setIsAccordionOpen] = useState<'open' | 'closed'>(
    scheduling[type].enabled ? 'open' : 'closed'
  );
  const [isPlatinumPopoverOpen, setIsPlatinumPopoverOpen] = useState(false);

  const isGated = !hasPlatinumLicense && type === SyncJobType.ACCESS_CONTROL;
  const isDocumentLevelSecurityDisabled =
    !connector.configuration.use_document_level_security?.value;

  const isEnableSwitchDisabled =
    type === SyncJobType.ACCESS_CONTROL && (!hasPlatinumLicense || isDocumentLevelSecurityDisabled);

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder>
        <EuiAccordion
          paddingSize="m"
          id={`${type}-content-sync-schedule`}
          buttonContent={
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h4>{getAccordionTitle(type)}</h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <p>{getDescriptionText(type)}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          forceState={isAccordionOpen}
          onToggle={(isOpen) => {
            setIsAccordionOpen(isOpen ? 'open' : 'closed');
          }}
          extraAction={
            isGated ? (
              <EuiFlexGroup responsive={false} gutterSize="s">
                <EuiFlexItem>
                  <PlatinumLicensePopover
                    isPopoverOpen={isPlatinumPopoverOpen}
                    closePopover={() => setIsPlatinumPopoverOpen(!isPlatinumPopoverOpen)}
                    button={
                      <EuiButtonIcon
                        aria-label={i18n.translate(
                          'searchConnectors.selectConnector.openPopoverLabel',
                          {
                            defaultMessage: 'Open licensing popover',
                          }
                        )}
                        iconType="questionInCircle"
                        onClick={() => setIsPlatinumPopoverOpen(!isPlatinumPopoverOpen)}
                      />
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EnableSwitch
                    disabled={isEnableSwitchDisabled}
                    checked={scheduling[type].enabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIsAccordionOpen('open');
                      }
                      setScheduling({
                        ...scheduling,
                        ...{
                          [type]: {
                            enabled: e.target.checked,
                            interval: scheduling[type].interval,
                          },
                        },
                      });
                      setHasSyncTypeChanges(true);
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EnableSwitch
                disabled={isEnableSwitchDisabled}
                checked={scheduling[type].enabled}
                onChange={(e) => {
                  if (e.target.checked) {
                    setIsAccordionOpen('open');
                  }
                  setScheduling({
                    ...scheduling,
                    ...{
                      [type]: {
                        enabled: e.target.checked,
                        interval: scheduling[type].interval,
                      },
                    },
                  });
                  setHasSyncTypeChanges(true);
                }}
              />
            )
          }
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <ConnectorCronEditor
                hasSyncTypeChanges={hasSyncTypeChanges}
                setHasSyncTypeChanges={setHasSyncTypeChanges}
                disabled={isGated}
                frequencyBlockList={
                  type === SyncJobType.ACCESS_CONTROL || type === SyncJobType.FULL ? [] : undefined
                }
                scheduling={scheduling[type]}
                onReset={() => {
                  setScheduling({
                    ...schedulingInput,
                  });
                }}
                onSave={(interval) => {
                  const updatedScheduling: SchedulingConfiguraton = {
                    ...connector.scheduling,
                    [type]: {
                      ...scheduling[type],
                      interval,
                    },
                  };
                  updateScheduling(updatedScheduling);
                  setHasSyncTypeChanges(false);
                }}
                status={updateConnectorStatus}
                dataTelemetryIdPrefix={dataTelemetryIdPrefix}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiAccordion>
      </EuiPanel>
    </>
  );
};

export interface Schedule {
  days: string;
  hours: string;
  minutes: string;
}
