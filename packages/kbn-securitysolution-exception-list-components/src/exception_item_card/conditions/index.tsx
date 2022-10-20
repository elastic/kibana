/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';

import { borderCss } from './conditions.styles';
import { EntryContent } from './entry_content';
import { OsCondition } from './os_conditions';
import type { CriteriaConditionsProps, Entry } from './types';

export const ExceptionItemCardConditions = memo<CriteriaConditionsProps>(
  ({ os, entries, dataTestSubj }) => {
    return (
      <EuiPanel
        color="subdued"
        hasBorder={true}
        hasShadow={false}
        data-test-subj={dataTestSubj}
        className={borderCss}
      >
        {os?.length ? <OsCondition os={os} dataTestSubj={dataTestSubj} /> : null}
        {entries.map((entry: Entry, index: number) => {
          const nestedEntries = 'entries' in entry ? entry.entries : [];
          return (
            <div key={`ExceptionItemCardConditionsContainer${index}`}>
              <EntryContent
                key={`entry${index}`}
                entry={entry}
                index={index}
                dataTestSubj={dataTestSubj}
              />
              {nestedEntries?.length
                ? nestedEntries.map((nestedEntry: Entry, nestedIndex: number) => (
                    <EntryContent
                      key={`nestedEntry${index}${nestedIndex}`}
                      entry={nestedEntry}
                      index={nestedIndex}
                      isNestedEntry={true}
                      dataTestSubj={dataTestSubj}
                    />
                  ))
                : null}
            </div>
          );
        })}
      </EuiPanel>
    );
  }
);
ExceptionItemCardConditions.displayName = 'ExceptionItemCardConditions';
