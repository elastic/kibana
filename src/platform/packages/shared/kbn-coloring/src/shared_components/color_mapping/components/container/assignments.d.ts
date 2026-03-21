import React from 'react';
import type { KbnPalettes } from '@kbn/palettes';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import type { ColorMappingInputData } from '../../categorical_color_mapping';
export declare function Assignments({ data, palettes, isDarkMode, specialTokens, formatter, allowCustomMatch, }: {
    palettes: KbnPalettes;
    data: ColorMappingInputData;
    isDarkMode: boolean;
    /**
     * map between original and formatted tokens used to handle special cases, like the Other bucket and the empty bucket
     */
    specialTokens: Map<string, string>;
    formatter?: IFieldFormat;
    allowCustomMatch?: boolean;
}): React.JSX.Element;
