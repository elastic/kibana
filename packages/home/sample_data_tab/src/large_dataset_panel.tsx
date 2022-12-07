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
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConfigureDatasetPanel, FIELD_TYPES, FieldValue } from './configure_dataset_panel';
import { LargeDataSetParams, CustomDatasetParams, useServices } from './services';
import { useSVG } from './hooks';

const INDEX_NAME = 'kibana_sample_dataset_large';
const NOTIFICATION_KEY = 'largedatasetPanel:notificationShown';
const EXPECTED_NR_OF_DOCUMENTS_KEY = 'largedatasetPanel:expectedNrOfDocuments';

const i18nTexts = {
  generateTitle: i18n.translate('homePackages.largeDatasetPanel.generateTitle', {
    defaultMessage: 'Generate large data set',
  }),
  generateSubtitle: i18n.translate('homePackages.largeDatasetPanel.generateSubtitle', {
    defaultMessage:
      'Generate a large data set with random field types and values. Takes about 10 minutes. Turn the switch on to configure the dataset, or leave the switch off to generate a dataset with default parameters',
  }),
  installButtonText: i18n.translate('homePackages.largeDatasetPanel.button.install', {
    defaultMessage: 'Generate!',
  }),
  unInstallButtonText: i18n.translate('homePackages.largeDatasetPanel.button.uninstall', {
    defaultMessage: 'Uninstall',
  }),
  datasetGeneratedSuccessMessage: i18n.translate('homePackages.largeDatasetPanel.toast.success', {
    defaultMessage: 'Dataset successfully generated.',
  }),
  datasetUninstallErrorMessage: i18n.translate(
    'homePackages.largeDatasetPanel.toast.uninstall.error',
    {
      defaultMessage: 'Error uninstalling dataset',
    }
  ),
  datasetUninstallSuccess: i18n.translate(
    'homePackages.largeDatasetPanel.toast.uninstall.success',
    {
      defaultMessage: 'Dataset successfully uninstalled',
    }
  ),
  datasetGenerationInProgress: i18n.translate(
    'homePackages.largeDatasetPanel.datasetGenerationInProgress.info',
    {
      defaultMessage: 'Dataset generation in progress.',
    }
  ),
  datasetAlreadyGenerated: i18n.translate(
    'homePackages.largeDatasetPanel.datasetAlreadyGenerated.info',
    {
      defaultMessage: 'Large dataset already generated.',
    }
  ),
  configure: i18n.translate('homePackages.largeDatasetPanel.configureSwitch.label', {
    defaultMessage: 'Configure your dataset: ',
  }),
};

interface Props {
  installLargeDataset: (params: LargeDataSetParams) => Promise<void>;
  installCustomDataset: (params: CustomDatasetParams) => Promise<void>;
  checkInstalled: () => Promise<{ installed: boolean; count: number }>;
  uninstallDataset: () => Promise<void>;
}

enum Status {
  EMPTY = 'empty',
  GENERATING = 'generating',
  DONE = 'done',
}

export const LargeDatasetPanel = ({
  installLargeDataset,
  installCustomDataset,
  checkInstalled,
  uninstallDataset,
}: Props) => {
  const [imageSrc] = useSVG();
  const [checked, setChecked] = useState<boolean>(false);
  const [installStatus, setInstallStatus] = useState<Status>(Status.EMPTY);
  const [nrOfDocuments, setNrOfDocuments] = useState<number>(100000);
  const [nrOfFields, setNrOfFields] = useState<number>(70);
  const [discoverUrl, setDiscoverUrl] = useState<string>('#');
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();
  const { notifySuccess, notifyError, getDiscoverLocator } = useServices();
  const [fieldValues, setFieldValues] = useState<FieldValue[]>([
    {
      name: '',
      type: FIELD_TYPES[0],
    },
  ]);

  const image = imageSrc ? <EuiImage alt={'demo image'} size="l" src={imageSrc} /> : null;

  const discoverLocator = getDiscoverLocator();

  useEffect(() => {
    const checkIfInstalled = async () => {
      const { installed, count } = await checkInstalled();
      const prevStatus = sessionStorage.getItem(INDEX_NAME);
      const expectedNrOfDocuments = Number.parseInt(
        sessionStorage.getItem(EXPECTED_NR_OF_DOCUMENTS_KEY) || `${nrOfDocuments}`,
        10
      );
      const adjustedNrOfDocuments = 0.9 * expectedNrOfDocuments; // allow for some documents to fail generation
      if (installed && count >= adjustedNrOfDocuments) {
        if (!sessionStorage.getItem(NOTIFICATION_KEY)) {
          notifySuccess(i18nTexts.datasetGeneratedSuccessMessage);
          sessionStorage.setItem(NOTIFICATION_KEY, 'true');
        }
        updateSessionStorage(Status.DONE);
      } else if (installed && prevStatus !== Status.DONE) {
        updateSessionStorage(Status.GENERATING);
      } else if (!installed && prevStatus !== Status.GENERATING) {
        updateSessionStorage(Status.EMPTY);
      }
    };
    const getDiscoverUrl = async () => {
      // @ts-expect-error
      const url = await discoverLocator.getRedirectUrl({ indexPatternId: null });
      setDiscoverUrl(url);
    };
    sessionStorage.setItem(EXPECTED_NR_OF_DOCUMENTS_KEY, nrOfDocuments.toString(10));
    checkIfInstalled();
    getDiscoverUrl();
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

  const updateFieldValues = (values: FieldValue[]) => {
    setFieldValues(values);
  };

  const onInstallClick = async () => {
    /*try {
      const fieldsToSend = fieldValues
        .filter((value) => value.name !== '')
        .map((el) => {
          return {
            name: el.name,
            type: el.type.value,
          };
        });
      installLargeDataset({ nrOfDocuments, nrOfFields, fieldValues: fieldsToSend });
      updateSessionStorage(Status.GENERATING);
    } catch {
      notifyError(i18nTexts.datasetUninstallErrorMessage);
    }*/
    try {
      const format = [
        {
          name: 'Country',
          type: 'country',
          distinctValues: 30,
        },
        { name: 'State', type: 'state', distinctValues: 120 } ,
        { name: 'County', type: 'county', distinctValues: 300 },
        { name: 'City', type: 'city', distinctValues: 2000 },
      ];
      installCustomDataset({ nrOfDocuments, fieldFormat: format });
      updateSessionStorage(Status.GENERATING);
    } catch {
      notifyError(i18nTexts.datasetUninstallErrorMessage);
    }
  };

  const onUninstallClick = async () => {
    try {
      await uninstallDataset();
      updateSessionStorage(Status.EMPTY);
      notifySuccess(i18nTexts.datasetUninstallSuccess);
    } catch {
      notifyError(i18nTexts.datasetUninstallErrorMessage);
    }
  };

  const onChange = async () => {
    setChecked(!checked);
  };

  const onNumberOfDocumentsChange = (value: number) => {
    setNrOfDocuments(value);
    sessionStorage.setItem(EXPECTED_NR_OF_DOCUMENTS_KEY, nrOfDocuments.toString(10));
  };

  const onNumberOfFieldsChange = (value: number) => {
    setNrOfFields(value);
  };

  const installTitleText =
    installStatus === Status.GENERATING
      ? i18nTexts.datasetGenerationInProgress
      : i18nTexts.datasetAlreadyGenerated;

  const installSubtitleText =
    installStatus === Status.GENERATING ? (
      <FormattedMessage
        id="homePackages.largeDatasetPanel.seeItInDiscover.info"
        defaultMessage="Once it is ready, you will be able to see the dataset in {discoverLink}, under the name: "
        values={{
          discoverLink: (
            <EuiLink href={discoverUrl} target="_blank" external>
              Discover
            </EuiLink>
          ),
        }}
      />
    ) : (
      <FormattedMessage
        id="homePackages.largeDatasetPanel.goToDiscover.info"
        defaultMessage="Go to {discoverLink} to see the dataset: "
        values={{
          discoverLink: (
            <EuiLink href={discoverUrl} target="_blank" external>
              Discover
            </EuiLink>
          ),
        }}
      />
    );

  const datasetInstalledLayout = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiText size="s">
          <h2>{installTitleText}</h2>
          <p>
            {installSubtitleText}
            <i>{INDEX_NAME}</i>
          </p>
          <EuiButton fill onClick={onUninstallClick} target="_blank">
            {i18nTexts.unInstallButtonText}
          </EuiButton>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ textAlign: 'center' }}>
        {image}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const generateDatasetLayout = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiText size="s">
          <h2>{i18nTexts.generateTitle}</h2>
          <p>{i18nTexts.generateSubtitle}</p>
          <EuiSwitch label={i18nTexts.configure} checked={checked} onChange={onChange} />
          <EuiSpacer />
          {checked ? (
            <ConfigureDatasetPanel
              fieldValues={fieldValues}
              updateFieldValues={updateFieldValues}
              nrOfDocuments={nrOfDocuments}
              nrOfFields={nrOfFields}
              onNumberOfFieldsChange={onNumberOfFieldsChange}
              onNumberOfDocumentsChange={onNumberOfDocumentsChange}
            />
          ) : null}
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
      {installStatus === Status.EMPTY ? generateDatasetLayout : datasetInstalledLayout}
    </EuiPanel>
  );
};
