/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Dispatch, useEffect, useState } from 'react';
import type {
  AddExceptionList,
  PersistHookProps,
  UpdateExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { addExceptionList, updateExceptionList } from '@kbn/securitysolution-list-api';

interface PersistReturnExceptionList {
  isLoading: boolean;
  isSaved: boolean;
}

export type ReturnPersistExceptionList = [
  PersistReturnExceptionList,
  Dispatch<AddExceptionList | null>
];

/**
 * Hook for creating or updating ExceptionList
 *
 * @param http Kibana http service
 * @param onError error callback
 *
 */
export const usePersistExceptionList = ({
  http,
  onError,
}: PersistHookProps): ReturnPersistExceptionList => {
  const [exceptionList, setExceptionList] = useState<AddExceptionList | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isUpdateExceptionList = (item: unknown): item is UpdateExceptionListSchema =>
    Boolean(item && (item as UpdateExceptionListSchema).id != null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsSaved(false);

    const saveExceptionList = async (): Promise<void> => {
      if (exceptionList != null) {
        try {
          setIsLoading(true);
          if (isUpdateExceptionList(exceptionList)) {
            await updateExceptionList({ http, list: exceptionList, signal: abortCtrl.signal });
          } else {
            await addExceptionList({ http, list: exceptionList, signal: abortCtrl.signal });
          }
          if (isSubscribed) {
            setIsSaved(true);
          }
        } catch (error) {
          if (isSubscribed) {
            onError(error);
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    saveExceptionList();
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, exceptionList, onError]);

  return [{ isLoading, isSaved }, setExceptionList];
};
