import React from 'react';
import type { SerializedValue } from '@kbn/data-plugin/common';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import type { ColorMapping } from '../../config';
import type { ColorAssignmentMatcher } from '../../color/color_assignment_matcher';
export declare const isNotNull: <T>(value: T | null) => value is NonNullable<T>;
export declare const Match: React.FC<{
    index: number;
    rules: ColorMapping.ColorRule[];
    updateRules: (rule: ColorMapping.ColorRule[]) => void;
    categories: SerializedValue[];
    specialTokens: Map<unknown, string>;
    formatter?: IFieldFormat;
    allowCustomMatch?: boolean;
    assignmentMatcher: ColorAssignmentMatcher;
}>;
