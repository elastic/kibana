/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import { convertRequestToLanguage, StorageKeys } from '../../../../services';
import type { Storage } from '../../../../services';
import {
  DEFAULT_LANGUAGE,
  AVAILABLE_LANGUAGES,
  KIBANA_API_PREFIX,
} from '../../../../../common/constants';
import type { EsHostService } from '../../../lib';
import type { EditorRequest } from '../types';

const getLanguageLabelByValue = (value: string) => {
  return AVAILABLE_LANGUAGES.find((lang) => lang.value === value)?.label || DEFAULT_LANGUAGE;
};

const copyText = async (text: string) => {
  if (window.navigator?.clipboard) {
    await window.navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('Could not copy to clipboard!');
};

interface UseCopyToLanguageProps {
  storage: Storage;
  esHostService: EsHostService;
  toasts: NotificationsStart['toasts'];
  getRequestsCallback: () => Promise<EditorRequest[]>;
  isKbnRequestSelectedCallback: () => Promise<boolean>;
}

export const useCopyToLanguage = ({
  storage,
  esHostService,
  toasts,
  getRequestsCallback,
  isKbnRequestSelectedCallback,
}: UseCopyToLanguageProps) => {
  const [defaultLanguage, setDefaultLanguage] = useState(
    storage.get(StorageKeys.DEFAULT_LANGUAGE, DEFAULT_LANGUAGE)
  );
  const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage);
  const [isKbnRequestSelected, setIsKbnRequestSelected] = useState<boolean>(false);

  // When a Kibana request is selected, force language to curl
  useEffect(() => {
    if (isKbnRequestSelected) {
      setCurrentLanguage(DEFAULT_LANGUAGE);
    } else {
      setCurrentLanguage(defaultLanguage);
    }
  }, [defaultLanguage, isKbnRequestSelected]);

  // This function will convert all the selected requests to the language by
  // calling convertRequestToLanguage and then copy the data to clipboard.
  const copyToLanguage = useCallback(
    async (language?: string) => {
      // Get the language we want to convert the requests to
      const withLanguage = language || currentLanguage;
      // Get all the selected requests
      const requests = await getRequestsCallback();

      // If we have any kbn requests, we should not allow the user to copy to
      // anything other than curl
      const hasKbnRequests = requests.some((req) => req.url.startsWith(KIBANA_API_PREFIX));

      if (hasKbnRequests && withLanguage !== 'curl') {
        toasts.addDanger({
          title: i18n.translate('console.consoleMenu.copyToMixedRequestsMessage', {
            defaultMessage: 'Kibana requests can only be copied to curl',
          }),
        });
        return;
      }

      const { data: requestsAsCode, error: requestError } = await convertRequestToLanguage({
        language: withLanguage,
        esHost: esHostService.getHost(),
        kibanaHost: window.location.origin,
        requests,
      });

      if (requestError) {
        toasts.addDanger({
          title: i18n.translate('console.consoleMenu.copyToFailedMessage', {
            defaultMessage:
              '{requestsCount, plural, one {Request} other {Requests}} could not be copied to clipboard',
            values: { requestsCount: requests.length },
          }),
        });
        return;
      }

      try {
        await copyText(requestsAsCode);

        toasts.addSuccess({
          title: i18n.translate('console.consoleMenu.copyToSuccessMessage', {
            defaultMessage:
              '{requestsCount, plural, one {Request} other {Requests}} copied to clipboard as {language}',
            values: {
              language: getLanguageLabelByValue(withLanguage),
              requestsCount: requests.length,
            },
          }),
        });
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate('console.consoleMenu.copyToClipboardFailedMessage', {
            defaultMessage: 'Could not copy to clipboard',
          }),
        });
      }
    },
    [currentLanguage, getRequestsCallback, esHostService, toasts]
  );

  const checkIsKbnRequestSelected = useCallback(async () => {
    setIsKbnRequestSelected(await isKbnRequestSelectedCallback());
  }, [isKbnRequestSelectedCallback]);

  const onCopyToLanguageSubmit = useCallback(async () => {
    // Check if current request is a Kibana request
    const isKbn = await isKbnRequestSelectedCallback();
    // If it's a Kibana request, use curl; otherwise use the current language
    if (isKbn) {
      await copyToLanguage(DEFAULT_LANGUAGE);
    } else {
      await copyToLanguage(); // Uses current language from copyToLanguage closure
    }
  }, [isKbnRequestSelectedCallback, copyToLanguage]);

  const handleLanguageChange = useCallback(
    (language: string) => {
      if (currentLanguage !== language) {
        storage.set(StorageKeys.DEFAULT_LANGUAGE, language);
      }
      setDefaultLanguage(language);
      if (!isKbnRequestSelected) {
        setCurrentLanguage(language);
      }
    },
    [storage, currentLanguage, isKbnRequestSelected]
  );

  return {
    defaultLanguage,
    currentLanguage,
    isKbnRequestSelected,
    copyToLanguage,
    onCopyToLanguageSubmit,
    handleLanguageChange,
    checkIsKbnRequestSelected,
  };
};
