/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiText,
  EuiImage,
  EuiSwitch,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiRange,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LargeDataSetParams, useServices } from './services';
import { useSVG } from './hooks';

const MIN = 10000;
const MAX = 1000000;
const STEP = 1000;
const INDEX_NAME = 'kibana_sample_data_large';

const i18nTexts = {
  generateTitle: i18n.translate('homePackages.largeDataSetPanel.generateTitle', {
    defaultMessage: 'Generate large data set',
  }),
  generateSubtitle: i18n.translate('homePackages.largeDataSetPanel.generateSubtitle', {
    defaultMessage:
      'Generate a large data set. Takes about 10 minutes. Turn the switch on to configure the dataset, or leave the switch off to generate a dataset with default parameters',
  }),
  installButtonText: i18n.translate('homePackages.largeDataSetPanel.button.install', {
    defaultMessage: 'Generate!',
  }),
  unInstallButtonText: i18n.translate('homePackages.largeDataSetPanel.button.uninstall', {
    defaultMessage: 'Uninstall',
  }),
  datasetGeneratedSuccessMessage: i18n.translate('homePackages.largeDataSetPanel.toast.success', {
    defaultMessage: 'Dataset successfully generated.',
  }),
  datasetUninstallErrorMessage: i18n.translate(
    'homePackages.largeDataSetPanel.toast.uninstall.error',
    {
      defaultMessage: 'Error uninstalling dataset',
    }
  ),
};

interface Props {
  installDataset: (params: LargeDataSetParams) => Promise<void>;
  checkInstalled: () => Promise<{ installed: boolean; count: number }>;
  uninstallDataset: () => Promise<void>;
}

enum Status {
  EMPTY = 'empty',
  GENERATING = 'generating',
  DONE = 'done',
}

export const LargeDatasetPanel = ({ installDataset, checkInstalled, uninstallDataset }: Props) => {
  const [imageSrc] = useSVG();
  const [checked, setChecked] = useState<boolean>(false);
  const [installStatus, setInstallStatus] = useState<Status>(Status.EMPTY);
  const [nrOfDocuments, setNrOfDocuments] = useState<number>(100000);
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();
  const { notifySuccess, notifyError } = useServices();

  const image = imageSrc ? <EuiImage alt={'demo image'} size="l" src={imageSrc} /> : null;

  useEffect(() => {
    const checkIfInstalled = async () => {
      const { installed, count } = await checkInstalled();
      const prevStatus = sessionStorage.getItem(INDEX_NAME);
      if (installed && count >= nrOfDocuments && prevStatus === Status.GENERATING) {
        notifySuccess(i18nTexts.datasetGeneratedSuccessMessage);
        updateSessionStorage(Status.DONE);
      } else if (installed && count < nrOfDocuments) {
        updateSessionStorage(Status.GENERATING);
      } else if (!installed && prevStatus !== Status.GENERATING) {
        updateSessionStorage(Status.EMPTY);
      }
    };
    checkIfInstalled();
    intervalRef.current = setInterval(checkIfInstalled, 30000); // half a minute
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSessionStorage = (status: Status) => {
    sessionStorage.setItem(INDEX_NAME, status);
    setInstallStatus(status);
  };

  const onInstallClick = async () => {
    try {
      installDataset({ nrOfDocuments });
      updateSessionStorage(Status.GENERATING);
    } catch {
      notifyError(i18nTexts.datasetUninstallErrorMessage);
    }
  };

  const onUninstallClick = async () => {
    try {
      await uninstallDataset();
      updateSessionStorage(Status.EMPTY);
    } catch {
      notifyError(i18nTexts.datasetUninstallErrorMessage);
    }
  };

  const onChange = async () => {
    setChecked(!checked);
  };

  const onNrOfDocumentsChange = (target: EventTarget | (EventTarget & HTMLInputElement)) => {
    setNrOfDocuments(Number((target as HTMLInputElement).value));
  };

  const configureLayout = (
    <EuiPanel>
      <EuiForm component="form">
        <EuiFormRow label="Number of documents">
          <EuiRange
            min={MIN}
            max={MAX}
            step={STEP}
            value={nrOfDocuments}
            onChange={(e) => onNrOfDocumentsChange(e.target)}
            showLabels
            showValue
          />
        </EuiFormRow>
      </EuiForm>
      <EuiSpacer />
    </EuiPanel>
  );

  const installTitleText =
    installStatus === Status.GENERATING
      ? 'Large dataset generation is in progress'
      : 'Large dataset already generated';

  const installSubtitleText =
    installStatus === Status.GENERATING
      ? 'Once it is ready, you will be able to see the dataset in Discover, under the name: '
      : 'Go to Discover to see the dataset: ';

  const installedLayout = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiText size="s">
          <h2>{installTitleText}</h2>
          <p>
            {installSubtitleText}
            <i>{INDEX_NAME}</i>
          </p>
          {installStatus === Status.DONE && (
            <EuiButton fill onClick={onUninstallClick} target="_blank">
              {i18nTexts.unInstallButtonText}
            </EuiButton>
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ textAlign: 'center' }}>
        {image}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const generateLayout = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiText size="s">
          <h2>{i18nTexts.generateTitle}</h2>
          <p>{i18nTexts.generateSubtitle}</p>
          <EuiSwitch label="Configure your own data set" checked={checked} onChange={onChange} />
          <EuiSpacer />
          {checked ? configureLayout : null}
          {checked ? <EuiSpacer /> : null}
          <EuiButton
            fill
            iconSide="right"
            iconType="popout"
            onClick={onInstallClick}
            target="_blank"
          >
            {i18nTexts.installButtonText}
          </EuiButton>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ textAlign: 'center' }}>
        {image}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel hasBorder paddingSize="xl">
      {installStatus === Status.EMPTY ? generateLayout : installedLayout}
    </EuiPanel>
  );
};
