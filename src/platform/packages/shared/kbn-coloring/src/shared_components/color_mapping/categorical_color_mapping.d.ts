import React from 'react';
import { type EnhancedStore } from '@reduxjs/toolkit';
import type { KbnPalettes } from '@kbn/palettes';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import type { SerializedValue } from '@kbn/data-plugin/common';
import type { ColorMapping } from './config';
export interface ColorMappingInputCategoricalData {
    type: 'categories';
    /**
     * An **ordered** array of serialized categories rendered in the visualization
     */
    categories: SerializedValue[];
}
export interface ColorMappingInputContinuousData {
    type: 'ranges';
    min: number;
    max: number;
    bins: number;
}
/**
 * A configuration object that is required to populate correctly the visible categories
 * or the ranges in the CategoricalColorMapping component
 */
export type ColorMappingInputData = ColorMappingInputCategoricalData | ColorMappingInputContinuousData;
/**
 * The props of the CategoricalColorMapping component
 */
export interface ColorMappingProps {
    /**
     * The initial color mapping model, usually coming from a the visualization saved object
     */
    model: ColorMapping.Config;
    /**
     * A collection of palette configurations
     */
    palettes: KbnPalettes;
    /**
     * A data description of what needs to be colored
     */
    data: ColorMappingInputData;
    /**
     * Theme dark mode
     */
    isDarkMode: boolean;
    /**
     * A map between original and formatted tokens used to handle special cases, like the Other bucket and the empty bucket
     */
    specialTokens: Map<string, string>;
    /**
     * A function called at every change in the model
     */
    onModelUpdate: (model: ColorMapping.Config) => void;
    /**
     * Formatter for raw value assignments
     */
    formatter?: IFieldFormat;
    /**
     * Allow custom match rule when no other option is found
     */
    allowCustomMatch?: boolean;
}
/**
 * The React component for mapping categorical values to colors
 */
export declare class CategoricalColorMapping extends React.Component<ColorMappingProps> {
    store: EnhancedStore<{
        colorMapping: ColorMapping.Config;
    }>;
    unsubscribe: () => void;
    constructor(props: ColorMappingProps);
    componentWillUnmount(): void;
    componentDidUpdate(prevProps: Readonly<ColorMappingProps>): void;
    render(): React.JSX.Element;
}
