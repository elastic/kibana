/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSelect } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { Template } from '@kbn/workflows-library';

export interface SolutionFilterProps {
  /** The full catalog — used to populate the list of solutions present. */
  templates: Template[];
  value: string | undefined;
  onChange: (solution: string | undefined) => void;
  /** Disabled and pre-selected when an active solution nav is detected. */
  disabled?: boolean;
}

function humanizeSolutionId(id: string): string {
  return id.length > 0 ? id[0].toUpperCase() + id.slice(1) : id;
}

export const SolutionFilter = React.memo<SolutionFilterProps>(
  ({ templates, value, onChange, disabled = false }) => {
    const options = useMemo(() => {
      const solutionsSet = new Set<string>();
      for (const template of templates) {
        for (const solution of template.solutions ?? []) {
          solutionsSet.add(solution);
        }
      }
      const solutions = Array.from(solutionsSet)
        .sort()
        .map((id) => ({ value: id, text: humanizeSolutionId(id) }));

      return [
        {
          value: '',
          text: i18n.translate('workflows.library.solutionFilter.allSolutions', {
            defaultMessage: 'All solutions',
          }),
        },
        ...solutions,
      ];
    }, [templates]);

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value || undefined),
      [onChange]
    );

    return (
      <EuiSelect
        disabled={disabled}
        data-test-subj="workflowLibrarySolutionFilter"
        aria-label={i18n.translate('workflows.library.solutionFilter.ariaLabel', {
          defaultMessage: 'Filter templates by solution',
        })}
        options={options}
        value={value ?? ''}
        onChange={handleChange}
      />
    );
  }
);
SolutionFilter.displayName = 'SolutionFilter';
