/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { EuiBadge, EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { PublishesUnsavedChanges } from '@kbn/presentation-publishing';

interface Props {
  onSave: () => Promise<void>;
  resetUnsavedChanges: () => void;
  unsavedChanges$: PublishesUnsavedChanges['unsavedChanges'];
}

export function TopNav(props: Props) {
  const isMounted = useMountedState();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  useEffect(() => {
    const subscription = props.unsavedChanges$.subscribe((unsavedChanges) => {
      setHasUnsavedChanges(unsavedChanges !== undefined);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [props.unsavedChanges$]);

  return (
    <EuiFlexGroup>
      {hasUnsavedChanges && (
        <>
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">Unsaved changes</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty disabled={isSaving} onClick={props.resetUnsavedChanges}>
              Reset
            </EuiButtonEmpty>
          </EuiFlexItem>
        </>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton
          disabled={isSaving || !hasUnsavedChanges}
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
