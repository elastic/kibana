/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiFieldText, EuiFlexGroup, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export interface SearchSessionNameProps {
  name: string;
  editName: (newName: string) => Promise<unknown>;
}

export const SearchSessionName: React.FC<SearchSessionNameProps> = ({ name, editName }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [newName, setNewName] = React.useState(name);

  const [isSaving, setIsSaving] = React.useState(false);
  const isNewNameValid = !!newName;

  useEffect(() => {
    if (!isEditing) {
      setNewName(name);
    }
  }, [isEditing, name]);

  return !isEditing ? (
    <EuiFlexGroup
      wrap={false}
      responsive={false}
      alignItems={'center'}
      justifyContent={'spaceBetween'}
      gutterSize={'none'}
      // padding to align with compressed input size
      style={{ paddingTop: 4, paddingBottom: 4 }}
    >
      <EuiText size={'s'} className={'eui-textTruncate'}>
        <h4 className={'eui-textTruncate'}>{name}</h4>
      </EuiText>
      <EuiButtonIcon
        autoFocus={true}
        iconType={'pencil'}
        color={'text'}
        aria-label={i18n.translate('data.searchSessionName.editAriaLabelText', {
          defaultMessage: 'Edit search session name',
        })}
        data-test-subj={'searchSessionNameEdit'}
        onClick={() => setIsEditing(true)}
      />
    </EuiFlexGroup>
  ) : (
    <EuiFieldText
      autoFocus={true}
      compressed={true}
      placeholder={i18n.translate('data.searchSessionName.placeholderText', {
        defaultMessage: 'Enter a name for the search session',
      })}
      value={newName}
      onChange={(e) => {
        setNewName(e.target.value);
      }}
      aria-label={i18n.translate('data.searchSessionName.ariaLabelText', {
        defaultMessage: 'Search session name',
      })}
      data-test-subj={'searchSessionNameInput'}
      append={
        <EuiButtonEmpty
          size={'xs'}
          color={'text'}
          onClick={async () => {
            if (!isNewNameValid) return;
            if (newName !== name && editName) {
              setIsSaving(true);
              try {
                await editName(newName!);
              } catch (e) {
                // handled by the service
              }
            }

            setIsSaving(false);
            setIsEditing(false);
          }}
          disabled={!isNewNameValid}
          isLoading={isSaving}
          data-test-subj={'searchSessionNameSave'}
        >
          <FormattedMessage id="data.searchSessionName.saveButtonText" defaultMessage="Save" />
        </EuiButtonEmpty>
      }
    />
  );
};
