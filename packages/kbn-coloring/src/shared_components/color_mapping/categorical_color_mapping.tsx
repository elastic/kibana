/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { type EnhancedStore, configureStore } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';
import { colorMappingReducer, updateModel } from './state/color_mapping';
import { Container } from './components/container/container';
import { ColorMapping } from './config';
import { uiReducer } from './state/ui';

/**
 * A configuration object that is required to populate correctly the visible categories
 * or the ranges in the CategoricalColorMapping component
 */
export type ColorMappingInputData =
  | {
      type: 'categories';
      /** an ORDERED array of categories rendered in the visualization  */
      categories: Array<string | string[]>;
    }
  | {
      type: 'ranges';
      min: number;
      max: number;
      bins: number;
    };

/**
 * The props of the CategoricalColorMapping component
 */
export interface ColorMappingProps {
  /** The initial color mapping model, usually coming from a the visualization saved object */
  model: ColorMapping.Config;
  /** A map of paletteId and palette configuration */
  palettes: Map<string, ColorMapping.CategoricalPalette>;
  /** A data description of what needs to be colored */
  data: ColorMappingInputData;
  /** Theme dark mode */
  isDarkMode: boolean;
  /** A map between original and formatted tokens used to handle special cases, like the Other bucket and the empty bucket */
  specialTokens: Map<string, string>;
  /** A function called at every change in the model */
  onModelUpdate: (model: ColorMapping.Config) => void;
}

/**
 * The React component for mapping categorical values to colors
 */
export class CategoricalColorMapping extends React.Component<ColorMappingProps> {
  store: EnhancedStore<{ colorMapping: ColorMapping.Config }>;
  unsubscribe: () => void;
  constructor(props: ColorMappingProps) {
    super(props);
    // configure the store at mount time
    this.store = configureStore({
      preloadedState: {
        colorMapping: props.model,
      },
      reducer: {
        colorMapping: colorMappingReducer,
        ui: uiReducer,
      },
    });
    // subscribe to store changes to update external tools
    this.unsubscribe = this.store.subscribe(() => {
      this.props.onModelUpdate(this.store.getState().colorMapping);
    });
  }
  componentWillUnmount() {
    this.unsubscribe();
  }
  componentDidUpdate(prevProps: Readonly<ColorMappingProps>) {
    if (!isEqual(prevProps.model, this.props.model)) {
      this.store.dispatch(updateModel(this.props.model));
    }
  }
  render() {
    const { palettes, data, isDarkMode, specialTokens } = this.props;
    return (
      <Provider store={this.store}>
        <Container
          palettes={palettes}
          data={data}
          isDarkMode={isDarkMode}
          specialTokens={specialTokens}
        />
      </Provider>
    );
  }
}
