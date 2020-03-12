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
import { flow } from 'fp-ts/lib/function';
import React, { useState, FunctionComponent } from 'react';
import classNames from 'classnames';

import { sortTextObjectsAsc, TextObjectWithId } from '../../../../common/text_object';

import { useTextObjectsCRUD } from '../../hooks/text_objects';
import { DeleteFileModal, FileTree as FileTreeComponent } from '../../components';
import { useTextObjectsActionContext, useTextObjectsReadContext } from '../../contexts';

import { filterTextObjects, EnhancedTextObjectWithId } from './filter_text_objects';

export const addDefaultValues = (textObjects: TextObjectWithId[]): TextObjectWithId[] =>
  textObjects.map(textObject => ({
    ...textObject,
    name: textObject.isScratchPad ? 'Default' : textObject.name ?? `Untitled`,
  }));

const searchAndSort = (searchTerm: string | undefined) =>
  flow(
    (textObjects: TextObjectWithId[]) =>
      searchTerm ? filterTextObjects(searchTerm, textObjects) : textObjects,
    sortTextObjectsAsc
  );

export const FileTree: FunctionComponent = () => {
  const [searchFilter, setSearchFilter] = useState<string | undefined>(undefined);
  const [isFileActionInProgress, setIsFileActionInProgress] = useState(false);
  const [idToDelete, setIdToDelete] = useState<undefined | string>(undefined);

  const textObjectsCRUD = useTextObjectsCRUD();
  const { textObjects, currentTextObjectId, textObjectsSaveError } = useTextObjectsReadContext();
  const dispatch = useTextObjectsActionContext();

  const prepareData = flow(addDefaultValues, searchAndSort(searchFilter));

  const filteredTextObjects: EnhancedTextObjectWithId[] = prepareData(
    Object.values(textObjects).filter(Boolean)
  );

  return (
    <>
      <FileTreeComponent
        onCreate={fileName => {
          setIsFileActionInProgress(true);
          textObjectsCRUD
            .create({
              // We don't set a text value here so that the default text value is
              // set for new files
              textObject: {
                updatedAt: Date.now(),
                createdAt: Date.now(),
                name: fileName,
              },
            })
            .finally(() => setIsFileActionInProgress(false));
        }}
        disabled={isFileActionInProgress}
        searchFilter={searchFilter}
        onSearchFilter={string => setSearchFilter(string)}
        entries={filteredTextObjects.map(({ isScratchPad, name, id, displayName }) => {
          return {
            id,
            className: classNames({
              conApp__fileTree__scratchPadEntry: isScratchPad,
              'conApp__fileTree__entry--selected': id === currentTextObjectId,
            }),
            name: name!,
            error: textObjectsSaveError[id],
            displayName,
            onSelect: () => {
              dispatch({
                type: 'setCurrent',
                payload: id,
              });
            },
            canDelete: !isScratchPad,
            onDelete: deleteId => {
              setIdToDelete(deleteId);
            },
            canEdit: !isScratchPad,
            onEdit: ({ name: fileName, id: idToEdit }) => {
              setIsFileActionInProgress(true);
              textObjectsCRUD
                .update({
                  textObject: {
                    id: idToEdit,
                    name: fileName,
                  },
                })
                .finally(() => {
                  setIsFileActionInProgress(false);
                });
            },
          };
        })}
      />
      {idToDelete && (
        <DeleteFileModal
          fileName={textObjects[idToDelete]?.name ?? 'Untitled'}
          onClose={() => setIdToDelete(undefined)}
          onDeleteConfirmation={() => {
            setIsFileActionInProgress(true);
            setIdToDelete(undefined);
            textObjectsCRUD.delete(textObjects[idToDelete]!).finally(() => {
              setIsFileActionInProgress(false);
            });
          }}
        />
      )}
    </>
  );
};
