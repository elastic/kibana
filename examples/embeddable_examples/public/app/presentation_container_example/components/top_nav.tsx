/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { EuiBadge, EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { unsavedChanges } from '../unsaved_changes';

interface Props {
  onSave: () => Promise<void>;
}

export function TopNav(props: Props) {
  const isMounted = useMountedState();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  /*useEffect(() => {
    return;
    const subscription = props.parentApi.unsavedChanges.subscribe((nextUnsavedChanges) => {
      setHasUnsavedChanges(nextUnsavedChanges !== undefined);
      unsavedChanges.save(nextUnsavedChanges ?? {});
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [props.parentApi]);*/
  
  return (
    <EuiFlexGroup>
      {hasUnsavedChanges && (
        <>
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">Unsaved changes</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              disabled={isSaving}
              onClick={async () => {
                
              }}
            >
              Reset
            </EuiButtonEmpty>
          </EuiFlexItem>
          
        </>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton
          disabled={isSaving}
          onClick={async () => {
            setIsSaving(true);
            await props.onSave();
            if (isMounted()) setIsSaving(false);
          }}
        >
          Save
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

}