/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FontLabel } from '../fonts';

/**
 * Enum of supported CSS `background-repeat` properties.
 */
export enum BackgroundRepeat {
  REPEAT = 'repeat',
  REPEAT_NO = 'no-repeat',
  REPEAT_X = 'repeat-x',
  REPEAT_Y = 'repeat-y',
  ROUND = 'round',
  SPACE = 'space',
}

/**
 * Enum of supported CSS `background-size` properties.
 */
export enum BackgroundSize {
  AUTO = 'auto',
  CONTAIN = 'contain',
  COVER = 'cover',
}

/**
 * Enum of supported CSS `font-style` properties.
 */
export enum FontStyle {
  ITALIC = 'italic',
  NORMAL = 'normal',
}

/**
 * Enum of supported CSS `font-weight` properties.
 */
export enum FontWeight {
  NORMAL = 'normal',
  BOLD = 'bold',
  BOLDER = 'bolder',
  LIGHTER = 'lighter',
  ONE = '100',
  TWO = '200',
  THREE = '300',
  FOUR = '400',
  FIVE = '500',
  SIX = '600',
  SEVEN = '700',
  EIGHT = '800',
  NINE = '900',
}

/**
 * Enum of supported CSS `overflow` properties.
 */
export enum Overflow {
  AUTO = 'auto',
  HIDDEN = 'hidden',
  SCROLL = 'scroll',
  VISIBLE = 'visible',
}

/**
 * Enum of supported CSS `text-align` properties.
 */
export enum TextAlignment {
  CENTER = 'center',
  JUSTIFY = 'justify',
  LEFT = 'left',
  RIGHT = 'right',
}

/**
 * Enum of supported CSS `text-decoration` properties.
 */
export enum TextDecoration {
  NONE = 'none',
  UNDERLINE = 'underline',
}

/**
 * Represents the various style properties that can be applied to an element.
 */
export interface CSSStyle {
  color?: string;
  fill?: string;
  fontFamily?: FontLabel;
  fontSize?: string;
  fontStyle?: FontStyle;
  fontWeight?: FontWeight;
  lineHeight?: number | string;
  textAlign?: TextAlignment;
  textDecoration?: TextDecoration;
}

/**
 * Represents an object containing style information for a Container.
 */
export interface ContainerStyle {
  border: string | null;
  borderRadius: string | null;
  padding: string | null;
  backgroundColor: string | null;
  backgroundImage: string | null;
  backgroundSize: BackgroundSize;
  backgroundRepeat: BackgroundRepeat;
  opacity: number | null;
  overflow: Overflow;
}

/**
 * An object that represents style information, typically CSS.
 */
export interface ExpressionTypeStyle {
  type: 'style';
  spec: CSSStyle;
  css: string;
}

export type Style = ExpressionTypeStyle;
