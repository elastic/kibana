/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useState, useCallback, useRef } from 'react';

export interface Content<T = any> {
  isValid: boolean | undefined;
  validate(): Promise<boolean>;
  getData(): T;
}

type Contents<T> = {
  [K in keyof T]: Content;
};

interface Validation<T extends object> {
  isValid: boolean | undefined;
  contents: {
    [K in keyof T]: boolean | undefined;
  };
}

export interface HookProps<T extends object> {
  defaultValue?: T;
  onChange?: (output: Content<T>) => void;
}

export interface MultiContent<T extends object> {
  updateContentAt: (id: keyof T, content: Content) => void;
  saveSnapshotAndRemoveContent: (id: keyof T) => void;
  getData: () => T;
  getSingleContentData: <K extends keyof T>(contentId: K) => T[K];
  validate: () => Promise<boolean>;
  validation: Validation<T>;
}

export function useMultiContent<T extends object>({
  defaultValue,
  onChange,
}: HookProps<T>): MultiContent<T> {
  /**
   * Each content validity is kept in this state. When updating a content with "updateContentAt()", we
   * update the state validity and trigger a re-render.
   */
  const [validation, setValidation] = useState<Validation<T>>({
    isValid: true,
    contents: {},
  } as Validation<T>);

  /**
   * The updated data where a content current data is merged when it unmounts
   */
  const [stateData, setStateData] = useState<T>(defaultValue ?? ({} as T));

  /**
   * A map object of all the active content(s) present in the DOM. In a multi step
   * form wizard, there is only 1 content at the time in the DOM, but in long vertical
   * flow content, multiple content could be present.
   * When a content unmounts it will remove itself from this map.
   */
  const contents = useRef<Contents<T>>({} as Contents<T>);

  const updateContentDataAt = useCallback(function (updatedData: { [key in keyof T]?: any }) {
    setStateData((prev) => ({
      ...prev,
      ...updatedData,
    }));
  }, []);

  /**
   * Read the multi content data.
   */
  const getData = useCallback((): T => {
    /**
     * If there is one or more active content(s) in the DOM, and it is valid,
     * we read its data and merge it into our stateData before returning it.
     */
    const activeContentData: Partial<T> = {};

    for (const [id, _content] of Object.entries(contents.current)) {
      if (validation.contents[id as keyof T] !== false) {
        const contentData = (_content as Content).getData();

        // Replace the getData() handler with the cached value
        (_content as Content).getData = () => contentData;

        activeContentData[id as keyof T] = contentData;
      }
    }

    return {
      ...stateData,
      ...activeContentData,
    };
  }, [stateData, validation]);

  /**
   * Read a single content data.
   */
  const getSingleContentData = useCallback(
    <K extends keyof T>(contentId: K): T[K] => {
      if (contents.current[contentId]) {
        return contents.current[contentId].getData();
      }
      return stateData[contentId];
    },
    [stateData]
  );

  const updateContentValidity = useCallback(
    (updatedData: { [key in keyof T]?: boolean | undefined }): boolean | undefined => {
      let isAllContentValid: boolean | undefined = validation.isValid;

      setValidation((prev) => {
        if (
          Object.entries(updatedData).every(
            ([contentId, isValid]) => prev.contents[contentId as keyof T] === isValid
          )
        ) {
          // No change in validation, nothing to update
          isAllContentValid = prev.isValid;
          return prev;
        }

        const nextContentsValidityState = {
          ...prev.contents,
          ...updatedData,
        };

        isAllContentValid = Object.values(nextContentsValidityState).some(
          (_isValid) => _isValid === undefined
        )
          ? undefined
          : Object.values(nextContentsValidityState).every(Boolean);

        return {
          isValid: isAllContentValid,
          contents: nextContentsValidityState,
        };
      });

      return isAllContentValid;
    },
    [validation.isValid]
  );

  /**
   * Validate the content(s) currently in the DOM
   */
  const validate = useCallback(async () => {
    if (Object.keys(contents.current).length === 0) {
      return Boolean(validation.isValid);
    }

    const updatedValidation = {} as { [key in keyof T]?: boolean | undefined };

    for (const [id, _content] of Object.entries(contents.current)) {
      const isValid = await (_content as Content).validate();
      (_content as Content).validate = async () => isValid;
      updatedValidation[id as keyof T] = isValid;
    }

    return Boolean(updateContentValidity(updatedValidation));
  }, [validation.isValid, updateContentValidity]);

  /**
   * Update a content. It replaces the content in our "contents" map and update
   * the state validation object.
   */
  const updateContentAt = useCallback(
    function (contentId: keyof T, content: Content) {
      contents.current[contentId] = content;

      const updatedValidity = { [contentId]: content.isValid } as {
        [key in keyof T]: boolean | undefined;
      };
      const isValid = updateContentValidity(updatedValidity);

      if (onChange !== undefined) {
        onChange({
          isValid,
          validate,
          getData,
        });
      }
    },
    [updateContentValidity, onChange, getData, validate]
  );

  /**
   * When a content unmounts we want to save its current data state so we will be able
   * to provide it as "defaultValue" the next time the component is mounted.
   */
  const saveSnapshotAndRemoveContent = useCallback(
    function (contentId: keyof T) {
      if (contents.current[contentId]) {
        // Merge the data in our stateData
        const updatedData = {
          [contentId]: contents.current[contentId].getData(),
        } as { [key in keyof T]?: any };
        updateContentDataAt(updatedData);

        // Remove the content from our map
        delete contents.current[contentId];
      }
    },
    [updateContentDataAt]
  );

  return {
    getData,
    getSingleContentData,
    validate,
    validation,
    updateContentAt,
    saveSnapshotAndRemoveContent,
  };
}
