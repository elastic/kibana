/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { EuiBadge, EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker } from '@elastic/eui';
import { unsavedChanges } from '../unsaved_changes';
import { TimeRange } from '@kbn/es-query';
import { PublishesUnsavedChanges } from '@kbn/presentation-publishing';

interface Props {
  dataLoading: boolean;
  onReload: () => void;
  onSave: () => Promise<void>;
  resetUnsavedChanges: () => void;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange | undefined;
  unsavedChanges$: PublishesUnsavedChanges['unsavedChanges'];
}

export function TopNav(props: Props) {
  const isMounted = useMountedState();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  useEffect(() => {
    const subscription = props.unsavedChanges$.subscribe((nextUnsavedChanges) => {
      console.log('nextUnsavedChanges', nextUnsavedChanges);
      setHasUnsavedChanges(nextUnsavedChanges !== undefined);
      unsavedChanges.save(nextUnsavedChanges ?? {});
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [unsavedChanges, props.unsavedChanges$]);
  
  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          isLoading={props.dataLoading}
          start={props.timeRange?.from}
          end={props.timeRange?.to}
          onTimeChange={({ start, end }) => {
            props.setTimeRange({
              from: start,
              to: end,
            });
          }}
          onRefresh={() => {
            props.onReload();
          }}
        />
      </EuiFlexItem>
      
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          {hasUnsavedChanges && (
            <>
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">Unsaved changes</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  disabled={isSaving}
                  onClick={props.resetUnsavedChanges}
                >
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );

}