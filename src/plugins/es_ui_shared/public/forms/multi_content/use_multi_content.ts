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
      if (validation.contents[id as keyof T]) {
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

  const updateContentValidity = useCallback(
    (updatedData: { [key in keyof T]?: boolean | undefined }): boolean | undefined => {
      let allContentValidity: boolean | undefined;

      setValidation((prev) => {
        if (
          Object.entries(updatedData).every(
            ([contentId, isValid]) => prev.contents[contentId as keyof T] === isValid
          )
        ) {
          // No change in validation, nothing to update
          allContentValidity = prev.isValid;
          return prev;
        }

        const nextContentsValidityState = {
          ...prev.contents,
          ...updatedData,
        };

        allContentValidity = Object.values(nextContentsValidityState).some(
          (_isValid) => _isValid === undefined
        )
          ? undefined
          : Object.values(nextContentsValidityState).every(Boolean);

        return {
          isValid: allContentValidity,
          contents: nextContentsValidityState,
        };
      });

      return allContentValidity;
    },
    []
  );

  /**
   * Validate the multi-content active content(s) in the DOM
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
  }, [updateContentValidity]);

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
    [updateContentValidity, onChange]
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
    validate,
    validation,
    updateContentAt,
    saveSnapshotAndRemoveContent,
  };
}
